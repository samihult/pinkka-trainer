/**
 * Firestore-backed Pinkka import job processing for backend-admin execution.
 *
 * The browser now only enqueues import jobs and observes progress; heavy Pinkka
 * fetch + Firestore write work happens here with the Admin SDK.
 */

const crypto = require("node:crypto");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const BASE_URL = "https://fmnh-ws-prod3.it.helsinki.fi/pinkka/api";
const CANONICAL_LEARNING_ITEMS_COLLECTION = "learning-items";
const LEGACY_CANONICAL_SPECIES_COLLECTION = "species";
const FIRESTORE_IN_QUERY_MAX = 10;
const FIRESTORE_BATCH_WRITE_MAX = 300;
const PINKKA_SPECIES_FETCH_CONCURRENCY = 8;
const JOB_PROGRESS_FLUSH_MS = 750;
const PINKKA_COLLECTION = "pinkka";
const NANOID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
const NANOID_SIZE = 21;
const INTERRUPTED_ERROR_MESSAGE = "Pinkka import interrupted.";

function createEmptyProgressLevel() {
  return {
    completed: 0,
    total: 0,
    currentEntityName: "",
    imageDownloadsCompleted: 0,
    imageDownloadsTotal: 0,
  };
}

function createEmptyPinkkaImportProgress() {
  return {
    groups: createEmptyProgressLevel(),
    stacks: createEmptyProgressLevel(),
    species: createEmptyProgressLevel(),
  };
}

function cloneProgress(progress) {
  return {
    groups: { ...progress.groups },
    stacks: { ...progress.stacks },
    species: { ...progress.species },
  };
}

function toUniqueNumbers(values) {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isTimestampLike(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.toDate === "function"
  );
}

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }
  if (isTimestampLike(value)) {
    return value.toDate();
  }
  return new Date(0);
}

function normalizeComparableValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeComparableValue(entry));
  }
  if (typeof value === "object" && value !== null) {
    const normalized = {};
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    for (const [key, entry] of entries) {
      normalized[key] = normalizeComparableValue(entry);
    }
    return normalized;
  }
  return value;
}

function areComparableEqual(left, right) {
  return (
    JSON.stringify(normalizeComparableValue(left)) ===
    JSON.stringify(normalizeComparableValue(right))
  );
}

function buildCanonicalId() {
  const bytes = crypto.randomBytes(NANOID_SIZE);
  return Array.from(bytes, (byte) => NANOID_ALPHABET[byte & 63]).join("");
}

function getLocalizedText(text, preferredLanguage = "fi") {
  if (!text) return "";
  if (typeof text === "string") return text;
  return (
    text[preferredLanguage] ||
    text.fi ||
    text.en ||
    text.sv ||
    Object.values(text)[0] ||
    ""
  );
}

function getPinkkaGroupDisplayName(group) {
  return getLocalizedText(group?.name, `Group ${group?.id ?? ""}`);
}

function getPinkkaStackDisplayName(stack) {
  return getLocalizedText(stack?.name, `Stack ${stack?.id ?? ""}`);
}

function getPinkkaSpeciesDisplayName(speciesId, detail) {
  return detail?.scientificName || `Species ${speciesId}`;
}

function getPreferredPinkkaImageUrl(asset) {
  if (!asset?.urls) {
    return null;
  }
  return (
    asset.urls.original ||
    asset.urls.full ||
    asset.urls.large ||
    asset.urls.square ||
    asset.urls.thumbnail ||
    null
  );
}

function getPinkkaGroupImageAssets(group) {
  return Array.isArray(group?.image) ? group.image : [];
}

function getPinkkaStackImageAssets(stack) {
  return stack?.image ? [stack.image] : [];
}

function getImageId(asset, fallbackPrefix, index) {
  return asset?.id || `${fallbackPrefix}-${index + 1}`;
}

function mapPinkkaImageAssetsToEntityImages(assets, fallbackIdPrefix) {
  return (assets || [])
    .map((asset, index) => {
      const sourceUrl = getPreferredPinkkaImageUrl(asset);
      if (!sourceUrl) {
        return null;
      }
      const imageId = getImageId(asset, fallbackIdPrefix, index);
      return {
        id: imageId,
        urls: {
          original: sourceUrl,
          full: sourceUrl,
          large: sourceUrl,
          square: sourceUrl,
          thumbnail: sourceUrl,
        },
      };
    })
    .filter(Boolean);
}

function getTaxonomyEntryByRank(detail, rank) {
  return detail?.taxonomy?.find((entry) => entry?.rank === rank);
}

function mapPinkkaTaxonomyChain(detail) {
  const mapped = [];
  for (const entry of detail?.taxonomy || []) {
    const taxonId = entry?.taxonId?.trim();
    const scientificName = entry?.scientificName?.trim();
    if (!taxonId || !scientificName) {
      continue;
    }
    mapped.push({
      taxonId,
      scientificName,
      ...(entry.vernacularName !== undefined
        ? { vernacularName: entry.vernacularName }
        : {}),
      ...(entry.rankName ? { rankName: entry.rankName } : {}),
      ...(entry.rank ? { rank: entry.rank } : {}),
    });
  }
  return mapped.length > 0 ? mapped : undefined;
}

function mapPinkkaSpeciesCardToLearningItemData(card) {
  return {
    taxonId: card?.taxonId || "",
    scientificName: card?.scientificName || "",
    ...(card?.vernacularName ? { vernacularName: card.vernacularName } : {}),
    images: [],
  };
}

function mapPinkkaSpeciesDetailToLearningItemData(detail) {
  const genusEntry = getTaxonomyEntryByRank(detail, "MX.genus");
  const familyEntry = getTaxonomyEntryByRank(detail, "MX.family");
  const taxonomy = mapPinkkaTaxonomyChain(detail);
  return {
    taxonId: detail?.taxonId || "",
    scientificName: detail?.scientificName || "",
    ...(genusEntry?.scientificName?.trim()
      ? { genusScientificName: genusEntry.scientificName.trim() }
      : {}),
    ...(genusEntry?.vernacularName
      ? { genusVernacularName: genusEntry.vernacularName }
      : {}),
    ...(familyEntry?.scientificName?.trim()
      ? { familyScientificName: familyEntry.scientificName.trim() }
      : {}),
    ...(familyEntry?.vernacularName
      ? { familyVernacularName: familyEntry.vernacularName }
      : {}),
    ...(taxonomy ? { taxonomy } : {}),
    ...(detail?.vernacularName
      ? { vernacularName: detail.vernacularName }
      : {}),
    ...(detail?.description ? { description: detail.description } : {}),
    images: (detail?.images || [])
      .map((image, index) => {
        const sourceUrl = getPreferredPinkkaImageUrl(image);
        if (!sourceUrl) {
          return null;
        }
        return {
          id:
            image?.id ||
            `${detail?.taxonId || detail?.scientificName || "species"}-${
              index + 1
            }`,
          urls: {
            original: sourceUrl,
            full: sourceUrl,
            large: sourceUrl,
            square: sourceUrl,
            thumbnail: sourceUrl,
          },
          ...(image?.caption ? { caption: image.caption } : {}),
          ...(image?.taxonId ? { taxonId: image.taxonId } : {}),
          ...(image?.meta ? { meta: image.meta } : {}),
        };
      })
      .filter(Boolean),
  };
}

function buildPinkkaSourceRecord({ entityType, externalId, data, metadata }) {
  return {
    source: "pinkka",
    entityType,
    externalId: String(externalId),
    data,
    ...(metadata ? { metadata } : {}),
  };
}

function buildContentSourceKey({ source, entityType, externalId }) {
  return `${source}:${entityType}:${externalId}`;
}

function getContentSourceKeys(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return undefined;
  }
  const keys = [
    ...new Set(
      records.map((record) =>
        buildContentSourceKey({
          source: record.source,
          entityType: record.entityType,
          externalId: record.externalId,
        }),
      ),
    ),
  ];
  return keys.length > 0 ? keys : undefined;
}

function upsertContentSourceRecord(records, nextRecord) {
  const previousRecords = Array.isArray(records) ? records : [];
  const filtered = previousRecords.filter(
    (record) =>
      !(
        record.source === nextRecord.source &&
        record.entityType === nextRecord.entityType &&
        record.externalId === nextRecord.externalId
      ),
  );
  return [...filtered, nextRecord];
}

function deriveManualOverrides(sourceData, currentData) {
  if (!currentData) {
    return undefined;
  }
  const overrides = {};
  for (const [key, value] of Object.entries(currentData)) {
    if (value === undefined) {
      continue;
    }
    if (!areComparableEqual(value, sourceData[key])) {
      overrides[key] = value;
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function getEntityManualOverrides(entity, sourceData) {
  if (!entity) {
    return undefined;
  }
  return (
    entity.manualOverrides || deriveManualOverrides(sourceData, entity.data)
  );
}

function mergeSourceContentData(sourceData, manualOverrides) {
  return {
    ...sourceData,
    ...(manualOverrides || {}),
  };
}

function getStackLinkedLearningItemIdsFromData(data) {
  return [
    ...new Set([
      ...((Array.isArray(data?.learningItemIds) ? data.learningItemIds : []) ||
        []),
      ...((Array.isArray(data?.speciesIds) ? data.speciesIds : []) || []),
    ]),
  ].filter(Boolean);
}

async function fetchPinkkaJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Pinkka request failed (${response.status} ${path})`);
  }
  return response.json();
}

async function fetchPinkkaGroupWithStacks(groupId) {
  return fetchPinkkaJson(`/pinkkas/${groupId}`);
}

async function fetchPinkkaSubStack(stackId) {
  return fetchPinkkaJson(`/subpinkkas/${stackId}`);
}

async function fetchPinkkaSpecies(speciesId) {
  return fetchPinkkaJson(`/speciescards/${speciesId}`);
}

async function fetchPinkkaSpeciesEntriesForStack(stack) {
  const speciesCards = Array.isArray(stack?.speciesCards)
    ? stack.speciesCards
    : [];
  const results = [];
  for (const speciesChunk of chunkArray(
    speciesCards,
    PINKKA_SPECIES_FETCH_CONCURRENCY,
  )) {
    const entries = await Promise.all(
      speciesChunk.map(async (card) => ({
        speciesId: card.id,
        card,
        detail: await fetchPinkkaSpecies(card.id).catch((error) => {
          logger.warn(
            "Pinkka species fetch failed; falling back to card data",
            {
              speciesId: card.id,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          return null;
        }),
      })),
    );
    results.push(...entries);
  }
  return results;
}

async function getOwnerGroupCount(ownerId) {
  const snapshot = await db
    .collection("groups")
    .where("ownerId", "==", ownerId)
    .get();
  return snapshot.size;
}

async function findCanonicalGroupByPinkkaGroupId(pinkkaGroupId) {
  const snapshot = await db
    .collection("groups")
    .where("pinkkaRef.groupId", "==", pinkkaGroupId)
    .limit(1)
    .get();
  return snapshot.docs[0] || null;
}

async function findCanonicalStackByPinkkaRef({
  canonicalGroupId,
  pinkkaGroupId,
  pinkkaStackId,
}) {
  const snapshot = await db
    .collection("groups")
    .doc(canonicalGroupId)
    .collection("stacks")
    .where("pinkkaRef.groupId", "==", pinkkaGroupId)
    .where("pinkkaRef.stackId", "==", pinkkaStackId)
    .limit(1)
    .get();
  return snapshot.docs[0] || null;
}

async function ensureCanonicalFromLegacyDoc(legacyDoc) {
  const canonicalRef = db
    .collection(CANONICAL_LEARNING_ITEMS_COLLECTION)
    .doc(legacyDoc.id);
  const canonicalSnapshot = await canonicalRef.get();
  if (!canonicalSnapshot.exists) {
    await canonicalRef.set({
      ...legacyDoc.data(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  const refreshed = await canonicalRef.get();
  return refreshed.exists ? refreshed : legacyDoc;
}

async function getCanonicalLearningItemsByPinkkaSpeciesIds(pinkkaSpeciesIds) {
  const uniqueIds = toUniqueNumbers(pinkkaSpeciesIds);
  const learningItemsByPinkkaSpeciesId = new Map();

  for (const chunk of chunkArray(uniqueIds, FIRESTORE_IN_QUERY_MAX)) {
    const [canonicalSnapshot, legacySnapshot] = await Promise.all([
      db
        .collection(CANONICAL_LEARNING_ITEMS_COLLECTION)
        .where("pinkkaRef.speciesId", "in", chunk)
        .get(),
      db
        .collection(LEGACY_CANONICAL_SPECIES_COLLECTION)
        .where("pinkkaRef.speciesId", "in", chunk)
        .get(),
    ]);

    canonicalSnapshot.docs.forEach((docSnapshot) => {
      const pinkkaSpeciesId = docSnapshot.data()?.pinkkaRef?.speciesId;
      if (typeof pinkkaSpeciesId === "number") {
        learningItemsByPinkkaSpeciesId.set(pinkkaSpeciesId, docSnapshot);
      }
    });

    for (const legacyDoc of legacySnapshot.docs) {
      const pinkkaSpeciesId = legacyDoc.data()?.pinkkaRef?.speciesId;
      if (
        typeof pinkkaSpeciesId === "number" &&
        !learningItemsByPinkkaSpeciesId.has(pinkkaSpeciesId)
      ) {
        learningItemsByPinkkaSpeciesId.set(
          pinkkaSpeciesId,
          await ensureCanonicalFromLegacyDoc(legacyDoc),
        );
      }
    }
  }

  return learningItemsByPinkkaSpeciesId;
}

function buildComparableSubset(value) {
  return normalizeComparableValue(value);
}

function createProgressReporter(jobRef, initialProgress) {
  const progress = {
    ...createEmptyPinkkaImportProgress(),
    ...cloneProgress(initialProgress || createEmptyPinkkaImportProgress()),
  };
  const completedGroupIds = new Set();
  const completedStackKeys = new Set();
  let lastFlushedAt = 0;
  let lastSerialized = "";

  async function flush(force = false) {
    const serialized = JSON.stringify(buildComparableSubset(progress));
    const now = Date.now();
    if (!force && serialized === lastSerialized) {
      return;
    }
    if (!force && now - lastFlushedAt < JOB_PROGRESS_FLUSH_MS) {
      return;
    }
    await jobRef.set(
      {
        progress: cloneProgress(progress),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    lastFlushedAt = Date.now();
    lastSerialized = serialized;
  }

  return {
    progress,
    async initialize() {
      await flush(true);
    },
    async extendTotals(totals) {
      if (typeof totals.groups === "number") {
        progress.groups.total += totals.groups;
      }
      if (typeof totals.stacks === "number") {
        progress.stacks.total += totals.stacks;
      }
      if (typeof totals.species === "number") {
        progress.species.total += totals.species;
      }
      await flush();
    },
    async setCurrent(level, name, imageTotal = 0) {
      progress[level].currentEntityName = name;
      progress[level].imageDownloadsCompleted = 0;
      progress[level].imageDownloadsTotal = imageTotal;
      await flush();
    },
    async completeGroup(groupId, name) {
      if (!completedGroupIds.has(groupId)) {
        completedGroupIds.add(groupId);
        progress.groups.completed += 1;
      }
      progress.groups.currentEntityName = name;
      if (progress.groups.completed > progress.groups.total) {
        progress.groups.total = progress.groups.completed;
      }
      await flush();
    },
    async completeStack(groupId, stackId, name) {
      const key = `${groupId}:${stackId}`;
      if (!completedStackKeys.has(key)) {
        completedStackKeys.add(key);
        progress.stacks.completed += 1;
      }
      progress.stacks.currentEntityName = name;
      if (progress.stacks.completed > progress.stacks.total) {
        progress.stacks.total = progress.stacks.completed;
      }
      await flush();
    },
    async completeSpecies(name) {
      progress.species.completed += 1;
      progress.species.currentEntityName = name;
      if (progress.species.completed > progress.species.total) {
        progress.species.total = progress.species.completed;
      }
      await flush();
    },
    async flush(force = false) {
      await flush(force);
    },
  };
}

async function isInterruptRequested(jobRef) {
  const snapshot = await jobRef.get();
  return snapshot.data()?.interruptRequestedAt != null;
}

async function assertJobNotInterrupted(jobRef) {
  if (await isInterruptRequested(jobRef)) {
    throw new Error(INTERRUPTED_ERROR_MESSAGE);
  }
}

async function commitOperations(operations) {
  const validOperations = operations.filter(Boolean);
  for (const chunk of chunkArray(validOperations, FIRESTORE_BATCH_WRITE_MAX)) {
    const batch = db.batch();
    chunk.forEach((operation) => {
      batch.set(operation.ref, operation.data, { merge: false });
    });
    await batch.commit();
  }
}

async function commitDeletes(refs) {
  for (const chunk of chunkArray(
    refs.filter(Boolean),
    FIRESTORE_BATCH_WRITE_MAX,
  )) {
    const batch = db.batch();
    chunk.forEach((ref) => {
      batch.delete(ref);
    });
    await batch.commit();
  }
}

async function markPinkkaEntityImportCompleted(pathSegments) {
  const [root, ...rest] = pathSegments;
  await db
    .collection(root)
    .doc(rest[0])
    .set(
      rest.length === 1
        ? {
            importStarted: FieldValue.delete(),
            importCompleted: FieldValue.serverTimestamp(),
          }
        : {},
      { merge: true },
    );

  if (rest.length <= 1) {
    return;
  }

  const targetRef = db.doc([root, ...rest].join("/"));
  await targetRef.set(
    {
      importStarted: FieldValue.delete(),
      importCompleted: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function getPinkkaGroupPath(groupId) {
  return [PINKKA_COLLECTION, String(groupId)];
}

function getPinkkaStackPath(groupId, stackId) {
  return [...getPinkkaGroupPath(groupId), "stacks", String(stackId)];
}

function getPinkkaSpeciesPath(groupId, stackId, speciesId) {
  return [
    ...getPinkkaStackPath(groupId, stackId),
    "species",
    String(speciesId),
  ];
}

async function markPinkkaStackAndSpeciesImportCompleted({
  groupId,
  stackId,
  speciesIds,
}) {
  const refs = [
    ...toUniqueNumbers(speciesIds).map((speciesId) =>
      db.doc(getPinkkaSpeciesPath(groupId, stackId, speciesId).join("/")),
    ),
    db.doc(getPinkkaStackPath(groupId, stackId).join("/")),
  ];
  for (const chunk of chunkArray(refs, FIRESTORE_BATCH_WRITE_MAX)) {
    const batch = db.batch();
    chunk.forEach((ref) => {
      batch.set(
        ref,
        {
          importStarted: FieldValue.delete(),
          importCompleted: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
    await batch.commit();
  }
}

async function markPinkkaGroupImportCompletedDirect(groupId) {
  await db.doc(getPinkkaGroupPath(groupId).join("/")).set(
    {
      importStarted: FieldValue.delete(),
      importCompleted: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function upsertCanonicalGroup({
  pinkkaGroup,
  requesterId,
  existingGroupDoc,
  order,
}) {
  const existingGroup = existingGroupDoc?.data();
  const groupId = existingGroupDoc?.id || buildCanonicalId();
  const sourceData = {
    name: pinkkaGroup.name,
    ...(pinkkaGroup.description
      ? { description: pinkkaGroup.description }
      : {}),
  };
  const sourceRecords = upsertContentSourceRecord(
    existingGroup?.sourceRecords,
    buildPinkkaSourceRecord({
      entityType: "group",
      externalId: pinkkaGroup.id,
      data: sourceData,
    }),
  );
  const manualOverrides = getEntityManualOverrides(existingGroup, sourceData);
  const mergedData = mergeSourceContentData(sourceData, manualOverrides);
  const nextDocumentData = {
    data: mergedData,
    sourceRecords,
    ...(getContentSourceKeys(sourceRecords)
      ? { sourceKeys: getContentSourceKeys(sourceRecords) }
      : {}),
    ...(manualOverrides ? { manualOverrides } : {}),
    pinkkaRef: { groupId: pinkkaGroup.id },
    images: mapPinkkaImageAssetsToEntityImages(
      getPinkkaGroupImageAssets(pinkkaGroup),
      `group-${pinkkaGroup.id}`,
    ),
    ownerId: existingGroup?.ownerId || requesterId,
    order: existingGroup?.order ?? order,
    isHidden: existingGroup?.isHidden ?? false,
    createdAt: existingGroup?.createdAt || Timestamp.now(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const previousComparableData = existingGroup
    ? {
        data: existingGroup.data,
        sourceRecords: existingGroup.sourceRecords,
        sourceKeys: existingGroup.sourceKeys,
        manualOverrides: existingGroup.manualOverrides,
        pinkkaRef: existingGroup.pinkkaRef,
        images: existingGroup.images,
        ownerId: existingGroup.ownerId,
        order: existingGroup.order,
        isHidden: existingGroup.isHidden,
      }
    : null;
  const nextComparableData = {
    data: nextDocumentData.data,
    sourceRecords: nextDocumentData.sourceRecords,
    sourceKeys: nextDocumentData.sourceKeys,
    manualOverrides: nextDocumentData.manualOverrides,
    pinkkaRef: nextDocumentData.pinkkaRef,
    images: nextDocumentData.images,
    ownerId: nextDocumentData.ownerId,
    order: nextDocumentData.order,
    isHidden: nextDocumentData.isHidden,
  };
  return {
    groupId,
    ref: db.collection("groups").doc(groupId),
    data: nextDocumentData,
    changed:
      !previousComparableData ||
      !areComparableEqual(previousComparableData, nextComparableData),
  };
}

async function upsertCanonicalStack({
  canonicalGroupId,
  pinkkaGroupId,
  pinkkaStack,
  requesterId,
  existingStackDoc,
  order,
  learningItemIds,
}) {
  const existingStack = existingStackDoc?.data();
  const stackId = existingStackDoc?.id || buildCanonicalId();
  const stackImages = mapPinkkaImageAssetsToEntityImages(
    getPinkkaStackImageAssets(pinkkaStack),
    pinkkaStack.imageId || `stack-${pinkkaStack.id}`,
  );
  const sourceData = {
    name: pinkkaStack.name,
    ...(pinkkaStack.description
      ? { description: pinkkaStack.description }
      : {}),
    images: stackImages,
  };
  const sourceRecords = upsertContentSourceRecord(
    existingStack?.sourceRecords,
    buildPinkkaSourceRecord({
      entityType: "stack",
      externalId: pinkkaStack.id,
      data: sourceData,
      metadata: { groupId: pinkkaGroupId },
    }),
  );
  const manualOverrides = getEntityManualOverrides(existingStack, sourceData);
  const mergedData = mergeSourceContentData(sourceData, manualOverrides);
  const nextLearningItemIds = [...new Set(learningItemIds)].filter(Boolean);
  const nextDocumentData = {
    stackId,
    parentGroupId: canonicalGroupId,
    data: mergedData,
    sourceRecords,
    ...(getContentSourceKeys(sourceRecords)
      ? { sourceKeys: getContentSourceKeys(sourceRecords) }
      : {}),
    ...(manualOverrides ? { manualOverrides } : {}),
    pinkkaRef: {
      groupId: pinkkaGroupId,
      stackId: pinkkaStack.id,
    },
    images: stackImages,
    learningItemIds: nextLearningItemIds,
    speciesIds: nextLearningItemIds,
    ownerId: existingStack?.ownerId || requesterId,
    order: existingStack?.order ?? order,
    isHidden: existingStack?.isHidden ?? false,
    createdAt: existingStack?.createdAt || Timestamp.now(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const previousComparableData = existingStack
    ? {
        parentGroupId: existingStack.parentGroupId,
        data: existingStack.data,
        sourceRecords: existingStack.sourceRecords,
        sourceKeys: existingStack.sourceKeys,
        manualOverrides: existingStack.manualOverrides,
        pinkkaRef: existingStack.pinkkaRef,
        images: existingStack.images,
        learningItemIds: getStackLinkedLearningItemIdsFromData(existingStack),
        speciesIds: existingStack.speciesIds,
        ownerId: existingStack.ownerId,
        order: existingStack.order,
        isHidden: existingStack.isHidden,
      }
    : null;
  const nextComparableData = {
    parentGroupId: nextDocumentData.parentGroupId,
    data: nextDocumentData.data,
    sourceRecords: nextDocumentData.sourceRecords,
    sourceKeys: nextDocumentData.sourceKeys,
    manualOverrides: nextDocumentData.manualOverrides,
    pinkkaRef: nextDocumentData.pinkkaRef,
    images: nextDocumentData.images,
    learningItemIds: nextDocumentData.learningItemIds,
    speciesIds: nextDocumentData.speciesIds,
    ownerId: nextDocumentData.ownerId,
    order: nextDocumentData.order,
    isHidden: nextDocumentData.isHidden,
  };
  return {
    stackId,
    ref: db
      .collection("groups")
      .doc(canonicalGroupId)
      .collection("stacks")
      .doc(stackId),
    data: nextDocumentData,
    changed:
      !previousComparableData ||
      !areComparableEqual(previousComparableData, nextComparableData),
  };
}

async function upsertCanonicalLearningItem({
  existingLearningItemDoc,
  requesterId,
  sourceData,
  pinkkaSpeciesId,
}) {
  const existingLearningItem = existingLearningItemDoc?.data();
  const learningItemId = existingLearningItemDoc?.id || buildCanonicalId();
  const sourceRecord = buildPinkkaSourceRecord({
    entityType: "species",
    externalId: pinkkaSpeciesId,
    data: sourceData,
  });
  const sourceRecords = upsertContentSourceRecord(
    existingLearningItem?.sourceRecords,
    sourceRecord,
  );
  const manualOverrides = getEntityManualOverrides(
    existingLearningItem,
    sourceData,
  );
  const mergedData = mergeSourceContentData(sourceData, manualOverrides);
  const nextDocumentData = {
    learningItemId,
    speciesId: learningItemId,
    data: mergedData,
    sourceRecords,
    ...(getContentSourceKeys(sourceRecords)
      ? { sourceKeys: getContentSourceKeys(sourceRecords) }
      : {}),
    ...(manualOverrides ? { manualOverrides } : {}),
    pinkkaRef: { speciesId: pinkkaSpeciesId },
    ...(Array.isArray(existingLearningItem?.testImageIds)
      ? { testImageIds: existingLearningItem.testImageIds }
      : {}),
    ...(typeof existingLearningItem?.isHidden === "boolean"
      ? { isHidden: existingLearningItem.isHidden }
      : {}),
    ownerId: existingLearningItem?.ownerId || requesterId,
    createdAt: existingLearningItem?.createdAt || Timestamp.now(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const previousComparableData = existingLearningItem
    ? {
        data: existingLearningItem.data,
        sourceRecords: existingLearningItem.sourceRecords,
        sourceKeys: existingLearningItem.sourceKeys,
        manualOverrides: existingLearningItem.manualOverrides,
        pinkkaRef: existingLearningItem.pinkkaRef,
        testImageIds: existingLearningItem.testImageIds,
        isHidden: existingLearningItem.isHidden,
        ownerId: existingLearningItem.ownerId,
      }
    : null;
  const nextComparableData = {
    data: nextDocumentData.data,
    sourceRecords: nextDocumentData.sourceRecords,
    sourceKeys: nextDocumentData.sourceKeys,
    manualOverrides: nextDocumentData.manualOverrides,
    pinkkaRef: nextDocumentData.pinkkaRef,
    testImageIds: nextDocumentData.testImageIds,
    isHidden: nextDocumentData.isHidden,
    ownerId: nextDocumentData.ownerId,
  };
  return {
    learningItemId,
    ref: db.collection(CANONICAL_LEARNING_ITEMS_COLLECTION).doc(learningItemId),
    data: nextDocumentData,
    changed:
      !previousComparableData ||
      !areComparableEqual(previousComparableData, nextComparableData),
  };
}

async function syncStackSpecies({
  jobRef,
  reporter,
  canonicalGroupId,
  pinkkaGroupId,
  pinkkaStack,
  requesterId,
  existingStackDoc,
}) {
  await assertJobNotInterrupted(jobRef);
  const stackName = getPinkkaStackDisplayName(pinkkaStack);
  await reporter.setCurrent("stacks", stackName);

  const speciesEntries = await fetchPinkkaSpeciesEntriesForStack(pinkkaStack);
  await reporter.extendTotals({ species: speciesEntries.length });

  const existingLearningItemsByPinkkaSpeciesId =
    await getCanonicalLearningItemsByPinkkaSpeciesIds(
      speciesEntries.map((entry) => entry.speciesId),
    );
  const learningItemIds = [];
  const operations = [];
  const pinkkaSpeciesIds = [];

  for (const entry of speciesEntries) {
    await assertJobNotInterrupted(jobRef);
    const detail = entry.detail;
    const sourceData = detail
      ? mapPinkkaSpeciesDetailToLearningItemData(detail)
      : mapPinkkaSpeciesCardToLearningItemData(entry.card);
    const speciesName = detail
      ? getPinkkaSpeciesDisplayName(entry.speciesId, detail)
      : sourceData.scientificName || `Species ${entry.speciesId}`;
    await reporter.setCurrent(
      "species",
      speciesName,
      detail?.images?.length ?? 0,
    );

    const upsertLearningItem = await upsertCanonicalLearningItem({
      existingLearningItemDoc:
        existingLearningItemsByPinkkaSpeciesId.get(entry.speciesId) || null,
      requesterId,
      sourceData,
      pinkkaSpeciesId: entry.speciesId,
    });
    if (upsertLearningItem.changed) {
      operations.push({
        ref: upsertLearningItem.ref,
        data: upsertLearningItem.data,
      });
    }
    learningItemIds.push(upsertLearningItem.learningItemId);
    pinkkaSpeciesIds.push(entry.speciesId);
    await reporter.completeSpecies(speciesName);
  }

  const stackUpsert = await upsertCanonicalStack({
    canonicalGroupId,
    pinkkaGroupId,
    pinkkaStack,
    requesterId,
    existingStackDoc,
    order: existingStackDoc?.data()?.order ?? pinkkaStack.orderNo ?? 0,
    learningItemIds,
  });
  if (stackUpsert.changed) {
    operations.unshift({
      ref: stackUpsert.ref,
      data: stackUpsert.data,
    });
  }

  await commitOperations(operations);
  await markPinkkaStackAndSpeciesImportCompleted({
    groupId: pinkkaGroupId,
    stackId: pinkkaStack.id,
    speciesIds: pinkkaSpeciesIds,
  });
  await reporter.completeStack(pinkkaGroupId, pinkkaStack.id, stackName);

  return {
    stackId: stackUpsert.stackId,
    learningItemIds,
  };
}

async function deleteMissingGroupStacks({
  canonicalGroupId,
  pinkkaGroupId,
  validPinkkaStackIds,
}) {
  const snapshot = await db
    .collection("groups")
    .doc(canonicalGroupId)
    .collection("stacks")
    .where("pinkkaRef.groupId", "==", pinkkaGroupId)
    .get();
  const deleteRefs = snapshot.docs
    .filter((docSnapshot) => {
      const pinkkaStackId = docSnapshot.data()?.pinkkaRef?.stackId;
      return (
        typeof pinkkaStackId === "number" &&
        !validPinkkaStackIds.has(pinkkaStackId)
      );
    })
    .map((docSnapshot) => docSnapshot.ref);
  await commitDeletes(deleteRefs);
}

async function importPinkkaGroupJob(jobRef, job, reporter) {
  const results = {
    groupIds: [],
    stackIds: [],
    learningItemIds: [],
  };
  const ownerId = job.requesterId;
  const requestedGroupIds = toUniqueNumbers(job.entityIds);

  for (const pinkkaGroupId of requestedGroupIds) {
    await assertJobNotInterrupted(jobRef);
    await reporter.setCurrent("groups", `Group ${pinkkaGroupId}`);

    const pinkkaGroup = await fetchPinkkaGroupWithStacks(pinkkaGroupId);
    const groupName = getPinkkaGroupDisplayName(pinkkaGroup);
    await reporter.setCurrent("groups", groupName);
    const existingGroupDoc =
      await findCanonicalGroupByPinkkaGroupId(pinkkaGroupId);
    const groupUpsert = await upsertCanonicalGroup({
      pinkkaGroup,
      requesterId: ownerId,
      existingGroupDoc,
      order:
        existingGroupDoc?.data()?.order ?? (await getOwnerGroupCount(ownerId)),
    });
    await commitOperations(
      groupUpsert.changed
        ? [{ ref: groupUpsert.ref, data: groupUpsert.data }]
        : [],
    );

    const sourceStacks = [...(pinkkaGroup.subPinkkas || [])].sort(
      (left, right) => (left.orderNo ?? 0) - (right.orderNo ?? 0),
    );
    await reporter.extendTotals({ stacks: sourceStacks.length });
    const validPinkkaStackIds = new Set();

    for (const sourceStack of sourceStacks) {
      await assertJobNotInterrupted(jobRef);
      validPinkkaStackIds.add(sourceStack.id);
      const existingStackDoc = await findCanonicalStackByPinkkaRef({
        canonicalGroupId: groupUpsert.groupId,
        pinkkaGroupId,
        pinkkaStackId: sourceStack.id,
      });
      const detailedStack =
        (await fetchPinkkaSubStack(sourceStack.id).catch(() => null)) ||
        sourceStack;
      const stackResult = await syncStackSpecies({
        jobRef,
        reporter,
        canonicalGroupId: groupUpsert.groupId,
        pinkkaGroupId,
        pinkkaStack: detailedStack,
        requesterId: ownerId,
        existingStackDoc,
      });
      results.stackIds.push(stackResult.stackId);
      results.learningItemIds.push(...stackResult.learningItemIds);
    }

    await deleteMissingGroupStacks({
      canonicalGroupId: groupUpsert.groupId,
      pinkkaGroupId,
      validPinkkaStackIds,
    });
    await markPinkkaGroupImportCompletedDirect(pinkkaGroupId);
    await reporter.completeGroup(pinkkaGroupId, groupName);
    results.groupIds.push(groupUpsert.groupId);
  }

  return {
    completedEntityCount: requestedGroupIds.length,
    groupIds: [...new Set(results.groupIds)],
    stackIds: [...new Set(results.stackIds)],
    learningItemIds: [...new Set(results.learningItemIds)],
  };
}

async function importPinkkaStackJob(jobRef, job, reporter) {
  const results = {
    groupIds: [],
    stackIds: [],
    learningItemIds: [],
  };
  const ownerId = job.requesterId;
  const pinkkaGroupId = job.groupId;
  const requestedStackIds = toUniqueNumbers(job.entityIds);
  if (!Number.isFinite(pinkkaGroupId)) {
    throw new Error("Pinkka stack imports require groupId.");
  }

  const pinkkaGroup = await fetchPinkkaGroupWithStacks(pinkkaGroupId);
  const groupName = getPinkkaGroupDisplayName(pinkkaGroup);
  await reporter.setCurrent("groups", groupName);
  const existingGroupDoc =
    await findCanonicalGroupByPinkkaGroupId(pinkkaGroupId);
  const groupUpsert = await upsertCanonicalGroup({
    pinkkaGroup,
    requesterId: ownerId,
    existingGroupDoc,
    order:
      existingGroupDoc?.data()?.order ?? (await getOwnerGroupCount(ownerId)),
  });
  await commitOperations(
    groupUpsert.changed
      ? [{ ref: groupUpsert.ref, data: groupUpsert.data }]
      : [],
  );
  await reporter.extendTotals({ groups: 1, stacks: requestedStackIds.length });

  for (const pinkkaStackId of requestedStackIds) {
    await assertJobNotInterrupted(jobRef);
    const stackDetail = await fetchPinkkaSubStack(pinkkaStackId);
    const existingStackDoc = await findCanonicalStackByPinkkaRef({
      canonicalGroupId: groupUpsert.groupId,
      pinkkaGroupId,
      pinkkaStackId,
    });
    const stackResult = await syncStackSpecies({
      jobRef,
      reporter,
      canonicalGroupId: groupUpsert.groupId,
      pinkkaGroupId,
      pinkkaStack: stackDetail,
      requesterId: ownerId,
      existingStackDoc,
    });
    results.stackIds.push(stackResult.stackId);
    results.learningItemIds.push(...stackResult.learningItemIds);
  }

  await markPinkkaGroupImportCompletedDirect(pinkkaGroupId);
  await reporter.completeGroup(pinkkaGroupId, groupName);
  results.groupIds.push(groupUpsert.groupId);

  return {
    completedEntityCount: requestedStackIds.length,
    groupIds: [...new Set(results.groupIds)],
    stackIds: [...new Set(results.stackIds)],
    learningItemIds: [...new Set(results.learningItemIds)],
  };
}

async function importPinkkaSpeciesJob(jobRef, job, reporter) {
  const ownerId = job.requesterId;
  const pinkkaGroupId = job.groupId;
  const pinkkaStackId = job.stackId;
  const requestedSpeciesIds = toUniqueNumbers(job.entityIds);
  if (!Number.isFinite(pinkkaGroupId) || !Number.isFinite(pinkkaStackId)) {
    throw new Error("Pinkka species imports require groupId and stackId.");
  }

  const pinkkaGroup = await fetchPinkkaGroupWithStacks(pinkkaGroupId);
  const pinkkaStack = await fetchPinkkaSubStack(pinkkaStackId);
  const groupName = getPinkkaGroupDisplayName(pinkkaGroup);
  const existingGroupDoc =
    await findCanonicalGroupByPinkkaGroupId(pinkkaGroupId);
  const groupUpsert = await upsertCanonicalGroup({
    pinkkaGroup,
    requesterId: ownerId,
    existingGroupDoc,
    order:
      existingGroupDoc?.data()?.order ?? (await getOwnerGroupCount(ownerId)),
  });
  await commitOperations(
    groupUpsert.changed
      ? [{ ref: groupUpsert.ref, data: groupUpsert.data }]
      : [],
  );

  const existingStackDoc = await findCanonicalStackByPinkkaRef({
    canonicalGroupId: groupUpsert.groupId,
    pinkkaGroupId,
    pinkkaStackId,
  });
  const existingStackData = existingStackDoc?.data() || {};
  const existingLearningItemIds =
    getStackLinkedLearningItemIdsFromData(existingStackData);

  await reporter.extendTotals({
    groups: 1,
    stacks: 1,
    species: requestedSpeciesIds.length,
  });
  await reporter.setCurrent("groups", groupName);
  await reporter.setCurrent("stacks", getPinkkaStackDisplayName(pinkkaStack));

  const existingLearningItemsByPinkkaSpeciesId =
    await getCanonicalLearningItemsByPinkkaSpeciesIds(requestedSpeciesIds);
  const nextLearningItemIds = [...existingLearningItemIds];
  const operations = [];

  for (const pinkkaSpeciesId of requestedSpeciesIds) {
    await assertJobNotInterrupted(jobRef);
    const detail = await fetchPinkkaSpecies(pinkkaSpeciesId);
    const speciesName = getPinkkaSpeciesDisplayName(pinkkaSpeciesId, detail);
    await reporter.setCurrent(
      "species",
      speciesName,
      detail?.images?.length ?? 0,
    );
    const upsertLearningItem = await upsertCanonicalLearningItem({
      existingLearningItemDoc:
        existingLearningItemsByPinkkaSpeciesId.get(pinkkaSpeciesId) || null,
      requesterId: ownerId,
      sourceData: mapPinkkaSpeciesDetailToLearningItemData(detail),
      pinkkaSpeciesId,
    });
    if (upsertLearningItem.changed) {
      operations.push({
        ref: upsertLearningItem.ref,
        data: upsertLearningItem.data,
      });
    }
    nextLearningItemIds.push(upsertLearningItem.learningItemId);
    await reporter.completeSpecies(speciesName);
  }

  const stackUpsert = await upsertCanonicalStack({
    canonicalGroupId: groupUpsert.groupId,
    pinkkaGroupId,
    pinkkaStack,
    requesterId: ownerId,
    existingStackDoc,
    order: existingStackData.order ?? pinkkaStack.orderNo ?? 0,
    learningItemIds: nextLearningItemIds,
  });
  if (stackUpsert.changed) {
    operations.unshift({ ref: stackUpsert.ref, data: stackUpsert.data });
  }

  await commitOperations(operations);
  await markPinkkaStackAndSpeciesImportCompleted({
    groupId: pinkkaGroupId,
    stackId: pinkkaStackId,
    speciesIds: requestedSpeciesIds,
  });
  await markPinkkaGroupImportCompletedDirect(pinkkaGroupId);
  await reporter.completeStack(
    pinkkaGroupId,
    pinkkaStackId,
    getPinkkaStackDisplayName(pinkkaStack),
  );
  await reporter.completeGroup(pinkkaGroupId, groupName);

  return {
    completedEntityCount: requestedSpeciesIds.length,
    groupIds: [groupUpsert.groupId],
    stackIds: [stackUpsert.stackId],
    learningItemIds: [...new Set(nextLearningItemIds)],
  };
}

function createInitialProgress(job) {
  const progress = createEmptyPinkkaImportProgress();
  if (job.target === "group") {
    progress.groups.total = toUniqueNumbers(job.entityIds).length;
  } else if (job.target === "stack") {
    progress.groups.total = Number.isFinite(job.groupId) ? 1 : 0;
    progress.stacks.total = toUniqueNumbers(job.entityIds).length;
  } else {
    progress.groups.total = Number.isFinite(job.groupId) ? 1 : 0;
    progress.stacks.total = Number.isFinite(job.stackId) ? 1 : 0;
    progress.species.total = toUniqueNumbers(job.entityIds).length;
  }
  return progress;
}

async function claimPinkkaImportJob(jobRef) {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    if (!snapshot.exists) {
      throw new Error("Pinkka import job not found.");
    }
    const status = snapshot.data()?.status;
    if (status && status !== "queued") {
      return;
    }
    transaction.set(
      jobRef,
      {
        status: "running",
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

/** Process one Firestore-backed Pinkka import job. */
async function processPinkkaImportJob(event) {
  const snapshot = event.data;
  if (!snapshot) {
    return;
  }

  const jobRef = snapshot.ref;
  const job = snapshot.data() || {};
  if (job.status && job.status !== "queued") {
    return;
  }

  logger.info("Pinkka import job started", {
    jobId: snapshot.id,
    target: job.target,
    groupId: job.groupId ?? null,
    stackId: job.stackId ?? null,
    entityCount: Array.isArray(job.entityIds) ? job.entityIds.length : 0,
  });

  await claimPinkkaImportJob(jobRef);
  const reporter = createProgressReporter(jobRef, createInitialProgress(job));
  await reporter.initialize();

  try {
    await assertJobNotInterrupted(jobRef);
    const summary =
      job.target === "group"
        ? await importPinkkaGroupJob(jobRef, job, reporter)
        : job.target === "stack"
          ? await importPinkkaStackJob(jobRef, job, reporter)
          : await importPinkkaSpeciesJob(jobRef, job, reporter);

    await reporter.flush(true);
    await jobRef.set(
      {
        status: "completed",
        summary,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    logger.info("Pinkka import job completed", {
      jobId: snapshot.id,
      target: job.target,
      summary,
    });
  } catch (error) {
    await reporter.flush(true).catch(() => {
      // best effort
    });

    if (error instanceof Error && error.message === INTERRUPTED_ERROR_MESSAGE) {
      await jobRef.set(
        {
          status: "interrupted",
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      logger.info("Pinkka import job interrupted", {
        jobId: snapshot.id,
        target: job.target,
      });
      return;
    }

    logger.error("Pinkka import job failed", {
      jobId: snapshot.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await jobRef.set(
      {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

module.exports = {
  createEmptyPinkkaImportProgress,
  processPinkkaImportJob,
};
