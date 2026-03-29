const {
  onDocumentCreated,
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { processPinkkaImportJob } = require("./pinkka-import-jobs");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

exports.onPinkkaImportJobCreated = onDocumentCreated(
  {
    document: "pinkkaImportJobs/{jobId}",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  processPinkkaImportJob,
);

const DAY_MS = 1000 * 60 * 60 * 24;
const MIN_STABILITY_DAYS = 0.25;
const DEFAULT_RETENTION_HORIZON_DAYS = 7;
const LEARNING_MAX = 0.3;
const STRENGTHENING_MAX = 0.95;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toDate(value) {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

function daysBetween(now, previous) {
  return Math.max(0, (now.getTime() - previous.getTime()) / DAY_MS);
}

function estimateRetention(
  progress,
  now,
  horizonDays = 0,
  metric = "accuracy",
) {
  if (!progress) return 0;
  const stabilitySource =
    metric === "accuracy"
      ? progress.accuracyStabilityDays
      : progress.speedStabilityDays;
  const stability = Math.max(MIN_STABILITY_DAYS, stabilitySource ?? 0);
  const elapsedDays =
    daysBetween(now, toDate(progress.lastReviewedAt)) +
    Math.max(0, horizonDays);
  if (elapsedDays === 0) return 1;
  return clamp(Math.exp(-elapsedDays / stability), 0, 1);
}

function combineRetention(accuracy, speed) {
  if (accuracy === null && speed === null) return 0;
  if (accuracy === null) return speed ?? 0;
  if (speed === null) return accuracy;
  return (accuracy + speed) / 2;
}

function getLearningCategory(score) {
  if (score === null) return "new";
  if (score < LEARNING_MAX) return "learning";
  if (score <= STRENGTHENING_MAX) return "strengthening";
  return "mastered";
}

function isScientificProgressDoc(data) {
  return Boolean(data) && data.nameType === "scientific";
}

function isScientificMastered(data) {
  if (!isScientificProgressDoc(data)) return false;
  const accuracy = estimateRetention(
    data,
    new Date(),
    DEFAULT_RETENTION_HORIZON_DAYS,
    "accuracy",
  );
  const speed = estimateRetention(
    data,
    new Date(),
    DEFAULT_RETENTION_HORIZON_DAYS,
    "speed",
  );
  return getLearningCategory(combineRetention(accuracy, speed)) === "mastered";
}

function toUnique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildScopedDocId(userId, scopeId) {
  return scopeId ? `${userId}_${scopeId}` : userId;
}

async function resolveNestedStackLocation(stackId) {
  const snapshot = await db
    .collectionGroup("stacks")
    .where("stackId", "==", stackId)
    .limit(1)
    .get();
  const stackDoc = snapshot.docs[0];
  if (!stackDoc) return null;
  const groupId = stackDoc.ref.parent.parent?.id;
  if (!groupId) return null;
  return { groupId, stackDoc };
}

async function getStackSnapshot(stackId) {
  const nestedLocation = await resolveNestedStackLocation(stackId);
  if (nestedLocation) {
    return {
      groupId: nestedLocation.groupId,
      stackDoc: nestedLocation.stackDoc,
      isNested: true,
    };
  }

  const stackDoc = await db.collection("stacks").doc(stackId).get();
  if (!stackDoc.exists) return null;
  return {
    groupId:
      typeof stackDoc.data()?.parentGroupId === "string"
        ? stackDoc.data().parentGroupId
        : undefined,
    stackDoc,
    isNested: false,
  };
}

async function countVisibleSpeciesInStack(stackId) {
  const stackSnapshot = await getStackSnapshot(stackId);
  if (!stackSnapshot?.stackDoc.exists) {
    return { groupId: undefined, totalSpeciesCount: 0 };
  }

  const stackData = stackSnapshot.stackDoc.data() || {};
  if (stackData.isHidden) {
    return { groupId: stackSnapshot.groupId, totalSpeciesCount: 0 };
  }

  if (stackSnapshot.groupId) {
    const groupDoc = await db
      .collection("groups")
      .doc(stackSnapshot.groupId)
      .get();
    if (!groupDoc.exists || groupDoc.data()?.isHidden) {
      return { groupId: stackSnapshot.groupId, totalSpeciesCount: 0 };
    }
  }

  if (stackSnapshot.isNested && stackSnapshot.groupId) {
    const speciesSnapshot = await db
      .collection("groups")
      .doc(stackSnapshot.groupId)
      .collection("stacks")
      .doc(stackId)
      .collection("species")
      .get();
    const totalSpeciesCount = speciesSnapshot.docs.filter(
      (docSnapshot) => !docSnapshot.data()?.isHidden,
    ).length;
    return { groupId: stackSnapshot.groupId, totalSpeciesCount };
  }

  const speciesSnapshot = await db
    .collection("species")
    .where("parentStackId", "==", stackId)
    .get();
  let totalSpeciesCount = speciesSnapshot.docs.filter(
    (docSnapshot) => !docSnapshot.data()?.isHidden,
  ).length;

  if (totalSpeciesCount === 0) {
    const legacySpeciesIds = stackData.speciesIds || [];
    if (Array.isArray(legacySpeciesIds) && legacySpeciesIds.length > 0) {
      const speciesDocs = await Promise.all(
        legacySpeciesIds.map((speciesId) =>
          db.collection("species").doc(speciesId).get(),
        ),
      );
      totalSpeciesCount = speciesDocs.filter(
        (docSnapshot) => docSnapshot.exists && !docSnapshot.data()?.isHidden,
      ).length;
    }
  }

  return { groupId: stackSnapshot.groupId, totalSpeciesCount };
}

async function getVisibleStacksForGroup(groupId) {
  const groupDoc = await db.collection("groups").doc(groupId).get();
  if (!groupDoc.exists || groupDoc.data()?.isHidden) return [];

  const nestedSnapshot = await db
    .collection("groups")
    .doc(groupId)
    .collection("stacks")
    .get();
  let stackIds = nestedSnapshot.docs
    .filter((docSnapshot) => !docSnapshot.data()?.isHidden)
    .map((docSnapshot) => docSnapshot.id);

  if (stackIds.length === 0) {
    const legacyStackIds = groupDoc.data()?.stackIds || [];
    if (Array.isArray(legacyStackIds) && legacyStackIds.length > 0) {
      const stackDocs = await Promise.all(
        legacyStackIds.map((stackId) =>
          db.collection("stacks").doc(stackId).get(),
        ),
      );
      stackIds = stackDocs
        .filter(
          (docSnapshot) => docSnapshot.exists && !docSnapshot.data()?.isHidden,
        )
        .map((docSnapshot) => docSnapshot.id);
    }
  }

  return stackIds;
}

async function countVisibleSpeciesInGroup(groupId) {
  const stackIds = await getVisibleStacksForGroup(groupId);
  const counts = await Promise.all(
    stackIds.map((stackId) => countVisibleSpeciesInStack(stackId)),
  );
  return counts.reduce((total, entry) => total + entry.totalSpeciesCount, 0);
}

async function countVisibleSpeciesGlobally() {
  const groupSnapshot = await db.collection("groups").get();
  const visibleGroupIds = groupSnapshot.docs
    .filter((docSnapshot) => !docSnapshot.data()?.isHidden)
    .map((docSnapshot) => docSnapshot.id);
  const groupTotals = await Promise.all(
    visibleGroupIds.map((groupId) => countVisibleSpeciesInGroup(groupId)),
  );
  return groupTotals.reduce((total, count) => total + count, 0);
}

function createPercent(masteredScientificCount, totalSpeciesCount) {
  if (totalSpeciesCount <= 0) return 0;
  return Math.round((masteredScientificCount / totalSpeciesCount) * 100);
}

async function writeStackScopeTotal(stackId) {
  const { groupId, totalSpeciesCount } =
    await countVisibleSpeciesInStack(stackId);
  await db
    .collection("stackScientificScopeTotals")
    .doc(stackId)
    .set(
      {
        stackId,
        groupId: groupId ?? null,
        totalSpeciesCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { groupId, totalSpeciesCount };
}

async function writeGroupScopeTotal(groupId) {
  const totalSpeciesCount = await countVisibleSpeciesInGroup(groupId);
  await db.collection("groupScientificScopeTotals").doc(groupId).set(
    {
      groupId,
      totalSpeciesCount,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return totalSpeciesCount;
}

async function writeGlobalScopeTotal() {
  const totalSpeciesCount = await countVisibleSpeciesGlobally();
  await db.collection("globalScientificScopeTotals").doc("global").set(
    {
      totalSpeciesCount,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return totalSpeciesCount;
}

async function synchronizeStackProgressTotals(
  stackId,
  totalSpeciesCount,
  groupId,
) {
  const snapshot = await db
    .collection("stackScientificProgress")
    .where("stackId", "==", stackId)
    .get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((docSnapshot) => {
    const masteredScientificCount =
      docSnapshot.data()?.masteredScientificCount ?? 0;
    batch.set(
      docSnapshot.ref,
      {
        groupId: groupId ?? null,
        totalSpeciesCount,
        masteredScientificPercent: createPercent(
          masteredScientificCount,
          totalSpeciesCount,
        ),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();
}

async function synchronizeGroupProgressTotals(groupId, totalSpeciesCount) {
  const snapshot = await db
    .collection("groupScientificProgress")
    .where("groupId", "==", groupId)
    .get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((docSnapshot) => {
    const masteredScientificCount =
      docSnapshot.data()?.masteredScientificCount ?? 0;
    batch.set(
      docSnapshot.ref,
      {
        totalSpeciesCount,
        masteredScientificPercent: createPercent(
          masteredScientificCount,
          totalSpeciesCount,
        ),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();
}

async function synchronizeGlobalProgressTotals(totalSpeciesCount) {
  const snapshot = await db.collection("globalScientificProgress").get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((docSnapshot) => {
    const masteredScientificCount =
      docSnapshot.data()?.masteredScientificCount ?? 0;
    batch.set(
      docSnapshot.ref,
      {
        totalSpeciesCount,
        masteredScientificPercent: createPercent(
          masteredScientificCount,
          totalSpeciesCount,
        ),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  await batch.commit();
}

async function refreshAffectedScopeTotals({ groupIds = [], stackIds = [] }) {
  const uniqueStackIds = toUnique(stackIds);
  const derivedGroupIds = [];

  for (const stackId of uniqueStackIds) {
    const { groupId, totalSpeciesCount } = await writeStackScopeTotal(stackId);
    await synchronizeStackProgressTotals(stackId, totalSpeciesCount, groupId);
    if (groupId) {
      derivedGroupIds.push(groupId);
    }
  }

  const uniqueGroupIds = toUnique([...groupIds, ...derivedGroupIds]);
  for (const groupId of uniqueGroupIds) {
    const totalSpeciesCount = await writeGroupScopeTotal(groupId);
    await synchronizeGroupProgressTotals(groupId, totalSpeciesCount);
  }

  const globalTotalSpeciesCount = await writeGlobalScopeTotal();
  await synchronizeGlobalProgressTotals(globalTotalSpeciesCount);
}

async function getOrCreateStackScopeTotal(stackId) {
  const docSnapshot = await db
    .collection("stackScientificScopeTotals")
    .doc(stackId)
    .get();
  if (docSnapshot.exists) {
    return {
      groupId:
        typeof docSnapshot.data()?.groupId === "string"
          ? docSnapshot.data().groupId
          : undefined,
      totalSpeciesCount: docSnapshot.data()?.totalSpeciesCount ?? 0,
    };
  }
  return writeStackScopeTotal(stackId);
}

async function getOrCreateGroupScopeTotal(groupId) {
  const docSnapshot = await db
    .collection("groupScientificScopeTotals")
    .doc(groupId)
    .get();
  if (docSnapshot.exists) {
    return docSnapshot.data()?.totalSpeciesCount ?? 0;
  }
  return writeGroupScopeTotal(groupId);
}

async function getOrCreateGlobalScopeTotal() {
  const docSnapshot = await db
    .collection("globalScientificScopeTotals")
    .doc("global")
    .get();
  if (docSnapshot.exists) {
    return docSnapshot.data()?.totalSpeciesCount ?? 0;
  }
  return writeGlobalScopeTotal();
}

async function applyScientificProgressDelta({
  collectionName,
  docId,
  userId,
  scopeField,
  scopeId,
  masteredDelta,
  totalSpeciesCount,
  extraFields = {},
}) {
  const ref = db.collection(collectionName).doc(docId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const currentCount = snapshot.exists
      ? (snapshot.data()?.masteredScientificCount ?? 0)
      : 0;
    const nextCount = Math.max(0, currentCount + masteredDelta);

    transaction.set(
      ref,
      {
        userId,
        [scopeField]: scopeId,
        ...extraFields,
        masteredScientificCount: nextCount,
        totalSpeciesCount,
        masteredScientificPercent: createPercent(nextCount, totalSpeciesCount),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

async function resolveProgressScopeData(data) {
  if (data?.parentStackId) {
    return {
      stackId: data.parentStackId,
      groupId:
        typeof data.parentGroupId === "string" ? data.parentGroupId : undefined,
    };
  }

  logger.warn("Learning progress document is missing parent stack metadata", {
    speciesId: data?.speciesId,
    userId: data?.userId,
  });
  return {
    stackId: undefined,
    groupId: undefined,
  };
}

async function handleScientificLearningProgressWrite(event) {
  const beforeData = event.data?.before.exists
    ? event.data.before.data()
    : null;
  const afterData = event.data?.after.exists ? event.data.after.data() : null;
  const relevantData = afterData ?? beforeData;

  if (!relevantData || relevantData.nameType !== "scientific") {
    return;
  }

  const userId = relevantData.userId;
  if (!userId) return;

  const beforeMastered = isScientificMastered(beforeData);
  const afterMastered = isScientificMastered(afterData);
  const masteredDelta = (afterMastered ? 1 : 0) - (beforeMastered ? 1 : 0);
  const { stackId, groupId: directGroupId } =
    await resolveProgressScopeData(relevantData);

  if (!stackId) return;

  const stackScope = await getOrCreateStackScopeTotal(stackId);
  const groupId = directGroupId ?? stackScope.groupId;
  const groupTotalSpeciesCount = groupId
    ? await getOrCreateGroupScopeTotal(groupId)
    : 0;
  const globalTotalSpeciesCount = await getOrCreateGlobalScopeTotal();

  await applyScientificProgressDelta({
    collectionName: "stackScientificProgress",
    docId: buildScopedDocId(userId, stackId),
    userId,
    scopeField: "stackId",
    scopeId: stackId,
    masteredDelta,
    totalSpeciesCount: stackScope.totalSpeciesCount,
    extraFields: {
      groupId: groupId ?? null,
    },
  });

  if (groupId) {
    await applyScientificProgressDelta({
      collectionName: "groupScientificProgress",
      docId: buildScopedDocId(userId, groupId),
      userId,
      scopeField: "groupId",
      scopeId: groupId,
      masteredDelta,
      totalSpeciesCount: groupTotalSpeciesCount,
    });
  }

  await applyScientificProgressDelta({
    collectionName: "globalScientificProgress",
    docId: userId,
    userId,
    scopeField: "userId",
    scopeId: userId,
    masteredDelta,
    totalSpeciesCount: globalTotalSpeciesCount,
  });
}

async function handleSpeciesScopeWrite(event, defaults = {}) {
  const beforeData = event.data?.before.exists
    ? event.data.before.data()
    : null;
  const afterData = event.data?.after.exists ? event.data.after.data() : null;
  const stackIds = toUnique([
    beforeData?.parentStackId,
    afterData?.parentStackId,
    defaults.stackId,
  ]);
  const groupIds = toUnique([
    beforeData?.parentGroupId,
    afterData?.parentGroupId,
    defaults.groupId,
  ]);

  await refreshAffectedScopeTotals({ groupIds, stackIds });
}

async function handleStackScopeWrite(event, defaults = {}) {
  const beforeData = event.data?.before.exists
    ? event.data.before.data()
    : null;
  const afterData = event.data?.after.exists ? event.data.after.data() : null;
  const stackIds = toUnique([
    event.params.stackId,
    beforeData?.stackId,
    afterData?.stackId,
    defaults.stackId,
  ]);
  const groupIds = toUnique([
    defaults.groupId,
    beforeData?.parentGroupId,
    afterData?.parentGroupId,
  ]);

  await refreshAffectedScopeTotals({ groupIds, stackIds });
}

async function handleGroupScopeWrite(event) {
  const beforeData = event.data?.before.exists
    ? event.data.before.data()
    : null;
  const afterData = event.data?.after.exists ? event.data.after.data() : null;
  const groupIds = toUnique([
    event.params.groupId,
    beforeData?.groupId,
    afterData?.groupId,
  ]);

  await refreshAffectedScopeTotals({ groupIds, stackIds: [] });
}

exports.onLearningProgressWritten = onDocumentWritten(
  {
    document: "learningProgress/{progressId}",
    region: "europe-west1",
  },
  async (event) => {
    await handleScientificLearningProgressWrite(event);
  },
);

exports.onSpeciesWritten = onDocumentWritten(
  {
    document: "species/{speciesId}",
    region: "europe-west1",
  },
  async (event) => {
    await handleSpeciesScopeWrite(event);
  },
);

exports.onNestedSpeciesWritten = onDocumentWritten(
  {
    document: "groups/{groupId}/stacks/{stackId}/species/{speciesId}",
    region: "europe-west1",
  },
  async (event) => {
    await handleSpeciesScopeWrite(event, {
      groupId: event.params.groupId,
      stackId: event.params.stackId,
    });
  },
);

exports.onStackWritten = onDocumentWritten(
  {
    document: "stacks/{stackId}",
    region: "europe-west1",
  },
  async (event) => {
    await handleStackScopeWrite(event);
  },
);

exports.onNestedStackWritten = onDocumentWritten(
  {
    document: "groups/{groupId}/stacks/{stackId}",
    region: "europe-west1",
  },
  async (event) => {
    await handleStackScopeWrite(event, {
      groupId: event.params.groupId,
      stackId: event.params.stackId,
    });
  },
);

exports.onGroupWritten = onDocumentWritten(
  {
    document: "groups/{groupId}",
    region: "europe-west1",
  },
  async (event) => {
    await handleGroupScopeWrite(event);
  },
);
