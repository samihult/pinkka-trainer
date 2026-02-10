import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase-config";
import type {
  LearningNameType,
  LearningProgress,
  LearningProgressState,
  StackLearningHistogram,
  QuizPreferences,
  Species,
  Stack,
  Group,
  SpeciesImage,
  User,
} from "../types";
import { normalizeQuizPreferences } from "../quiz/quiz-preferences";
import {
  fetchPinkkaGroupWithStacks,
  fetchPinkkaGroups,
  fetchPinkkaSpecies,
  fetchPinkkaSubStack,
  type PinkkaGroup,
  type PinkkaSubStack,
} from "../pinkka/pinkka-api";

/** Result summary for a Pinkka import. */
export interface PinkkaImportResult {
  /** Import batch id for the write. */
  importId: string;
  /** Imported group document id. */
  groupId?: string;
  /** Imported stack document ids. */
  stackIds: string[];
  /** Imported species document ids. */
  speciesIds: string[];
}

const pinkkaGroupImportStatusCache = new Map<number, boolean>();
const pinkkaStackImportStatusCache = new Map<number, boolean>();
const pinkkaSpeciesImportStatusCache = new Map<number, boolean>();
const PINKKA_COLLECTION = "pinkka";
const FIRESTORE_IN_QUERY_MAX = 10;

type Resolver<T> = (value: T) => void;

const pendingPinkkaGroupStatusResolvers = new Map<number, Resolver<boolean>[]>();
let pendingPinkkaGroupStatusFlush:
  | ReturnType<typeof setTimeout>
  | undefined;

type PendingStackStatus = {
  groupId: number;
  stackId: number;
  resolvers: Resolver<boolean>[];
};

const pendingPinkkaStackStatusResolvers = new Map<string, PendingStackStatus>();
let pendingPinkkaStackStatusFlush:
  | ReturnType<typeof setTimeout>
  | undefined;

type PendingSpeciesStatus = {
  groupId: number;
  stackId: number;
  speciesId: number;
  resolvers: Resolver<boolean>[];
};

const pendingPinkkaSpeciesStatusResolvers = new Map<string, PendingSpeciesStatus>();
let pendingPinkkaSpeciesStatusFlush:
  | ReturnType<typeof setTimeout>
  | undefined;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function toUniqueIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

/** Fetch imported status for Pinkka groups in batch. */
export async function getPinkkaGroupImportStatusMap(
  groupIds: number[],
): Promise<Record<number, boolean>> {
  const uniqueIds = toUniqueIds(groupIds);
  const statuses: Record<number, boolean> = {};
  const missingIds: number[] = [];

  for (const groupId of uniqueIds) {
    if (pinkkaGroupImportStatusCache.has(groupId)) {
      statuses[groupId] = pinkkaGroupImportStatusCache.get(groupId) === true;
      continue;
    }
    missingIds.push(groupId);
  }

  try {
    for (const chunk of chunkArray(missingIds, FIRESTORE_IN_QUERY_MAX)) {
      const snapshot = await getDocs(
        query(
          collection(db, PINKKA_COLLECTION),
          where(documentId(), "in", chunk.map(String)),
        ),
      );
      const importedIds = new Set(snapshot.docs.map((docSnapshot) => docSnapshot.id));
      for (const groupId of chunk) {
        const isImported = importedIds.has(String(groupId));
        pinkkaGroupImportStatusCache.set(groupId, isImported);
        statuses[groupId] = isImported;
      }
    }
  } catch (error) {
    console.error("Failed to fetch batch Pinkka group import statuses", error);
    for (const groupId of missingIds) {
      statuses[groupId] = false;
    }
  }

  for (const groupId of uniqueIds) {
    if (statuses[groupId] === undefined) {
      statuses[groupId] = false;
    }
  }

  return statuses;
}

/** Fetch imported status for Pinkka stacks in a group, in batch. */
export async function getPinkkaStackImportStatusMap(
  groupId: number,
  stackIds: number[],
): Promise<Record<number, boolean>> {
  const uniqueIds = toUniqueIds(stackIds);
  const statuses: Record<number, boolean> = {};
  const missingIds: number[] = [];

  for (const stackId of uniqueIds) {
    if (pinkkaStackImportStatusCache.has(stackId)) {
      statuses[stackId] = pinkkaStackImportStatusCache.get(stackId) === true;
      continue;
    }
    missingIds.push(stackId);
  }

  try {
    for (const chunk of chunkArray(missingIds, FIRESTORE_IN_QUERY_MAX)) {
      const snapshot = await getDocs(
        query(
          collection(db, PINKKA_COLLECTION, String(groupId), "stacks"),
          where(documentId(), "in", chunk.map(String)),
        ),
      );
      const importedIds = new Set(snapshot.docs.map((docSnapshot) => docSnapshot.id));
      for (const stackId of chunk) {
        const isImported = importedIds.has(String(stackId));
        pinkkaStackImportStatusCache.set(stackId, isImported);
        statuses[stackId] = isImported;
      }
    }
  } catch (error) {
    console.error(
      `Failed to fetch batch Pinkka stack import statuses for group ${groupId}`,
      error,
    );
    for (const stackId of missingIds) {
      statuses[stackId] = false;
    }
  }

  for (const stackId of uniqueIds) {
    if (statuses[stackId] === undefined) {
      statuses[stackId] = false;
    }
  }

  return statuses;
}

/** Fetch imported status for Pinkka species in a stack, in batch. */
export async function getPinkkaSpeciesImportStatusMap(
  groupId: number,
  stackId: number,
  speciesIds: number[],
): Promise<Record<number, boolean>> {
  const uniqueIds = toUniqueIds(speciesIds);
  const statuses: Record<number, boolean> = {};
  const missingIds: number[] = [];

  for (const speciesId of uniqueIds) {
    if (pinkkaSpeciesImportStatusCache.has(speciesId)) {
      statuses[speciesId] = pinkkaSpeciesImportStatusCache.get(speciesId) === true;
      continue;
    }
    missingIds.push(speciesId);
  }

  try {
    for (const chunk of chunkArray(missingIds, FIRESTORE_IN_QUERY_MAX)) {
      const snapshot = await getDocs(
        query(
          collection(
            db,
            PINKKA_COLLECTION,
            String(groupId),
            "stacks",
            String(stackId),
            "species",
          ),
          where(documentId(), "in", chunk.map(String)),
        ),
      );
      const importedIds = new Set(snapshot.docs.map((docSnapshot) => docSnapshot.id));
      for (const speciesId of chunk) {
        const isImported = importedIds.has(String(speciesId));
        pinkkaSpeciesImportStatusCache.set(speciesId, isImported);
        statuses[speciesId] = isImported;
      }
    }
  } catch (error) {
    console.error(
      `Failed to fetch batch Pinkka species import statuses for group ${groupId}, stack ${stackId}`,
      error,
    );
    for (const speciesId of missingIds) {
      statuses[speciesId] = false;
    }
  }

  for (const speciesId of uniqueIds) {
    if (statuses[speciesId] === undefined) {
      statuses[speciesId] = false;
    }
  }

  return statuses;
}

function stackStatusKey(groupId: number, stackId: number): string {
  return `${groupId}:${stackId}`;
}

function speciesStatusKey(
  groupId: number,
  stackId: number,
  speciesId: number,
): string {
  return `${groupId}:${stackId}:${speciesId}`;
}

/** Build a deterministic document id for learning progress. */
function buildLearningProgressDocId(
  userId: string,
  speciesId: string,
  nameType: LearningNameType,
): string {
  return `${userId}_${speciesId}_${nameType}`;
}

type PinkkaEntityDocument<T> = {
  /** Timestamp when the entity was imported. */
  importDate: Timestamp;
  /** Original Pinkka API response payload. */
  entity: T;
};

async function writePinkkaEntity<T>(
  pathSegments: string[],
  entity: T,
): Promise<void> {
  const [path, ...rest] = pathSegments;
  if (!path) {
    throw new Error("Pinkka entity path is required.");
  }
  const payload: PinkkaEntityDocument<T> = {
    importDate: Timestamp.now(),
    entity,
  };
  await setDoc(doc(db, path, ...rest), payload);
}

function getPinkkaGroupPath(groupId: number): string[] {
  return [PINKKA_COLLECTION, String(groupId)];
}

function getPinkkaStackPath(
  groupId: number,
  stackId: number,
): string[] {
  return [...getPinkkaGroupPath(groupId), "stacks", String(stackId)];
}

function getPinkkaSpeciesPath(
  groupId: number,
  stackId: number,
  speciesId: number,
): string[] {
  return [...getPinkkaStackPath(groupId, stackId), "species", String(speciesId)];
}

async function resolveGroupIdForStack(
  stackId: number,
  stackDetail?: PinkkaSubStack | null,
): Promise<number | null> {
  if (stackDetail?.pinkka?.id) {
    return stackDetail.pinkka.id;
  }

  const groups = await fetchPinkkaGroups();
  for (const group of groups) {
    const groupDetail = await fetchPinkkaGroupWithStacks(group.id);
    if (!groupDetail) {
      continue;
    }
    if ((groupDetail.subPinkkas ?? []).some((subStack) => subStack.id === stackId)) {
      return groupDetail.id;
    }
  }

  return null;
}

type PinkkaSpeciesLocation = {
  /** Parent group id for the species. */
  groupId: number;
  /** Parent stack id for the species. */
  stackId: number;
};

async function resolveSpeciesLocation(
  speciesId: number,
): Promise<PinkkaSpeciesLocation | null> {
  const groups = await fetchPinkkaGroups();
  for (const group of groups) {
    const groupDetail = await fetchPinkkaGroupWithStacks(group.id);
    if (!groupDetail) {
      continue;
    }

    for (const stackEntry of groupDetail.subPinkkas ?? []) {
      const stackDetail = await fetchPinkkaSubStack(stackEntry.id);
      if (!stackDetail) {
        continue;
      }

      const containsSpecies = (stackDetail.speciesCards ?? []).some(
        (card) => card.id === speciesId,
      );
      if (containsSpecies) {
        return { groupId: groupDetail.id, stackId: stackDetail.id };
      }
    }
  }

  return null;
}

async function writePinkkaGroupAndStackHierarchy(params: {
  groupId: number;
  stackId: number;
  groupEntity?: PinkkaGroup | null;
  stackEntity?: PinkkaSubStack | null;
}): Promise<{ group: PinkkaGroup; stack: PinkkaSubStack } | null> {
  const { groupId, stackId, groupEntity, stackEntity } = params;
  const resolvedGroup = groupEntity ?? (await fetchPinkkaGroupWithStacks(groupId));
  if (!resolvedGroup) {
    return null;
  }

  const resolvedStack = stackEntity ?? (await fetchPinkkaSubStack(stackId));
  if (!resolvedStack) {
    return null;
  }

  await writePinkkaEntity(getPinkkaGroupPath(groupId), resolvedGroup);
  await writePinkkaEntity(
    getPinkkaStackPath(groupId, resolvedStack.id),
    resolvedStack,
  );

  return {
    group: resolvedGroup,
    stack: resolvedStack,
  };
}

// User operations
/** Fetch a user's role by uid. */
export async function getUserRole(userId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() ? userDoc.data().role : null;
}

/** Update a user's role by uid. */
export async function updateUserRole(
  userId: string,
  role: string,
): Promise<void> {
  await updateDoc(doc(db, "users", userId), { role });
}

/** Fetch all users from Firestore. */
export async function getAllUsers(): Promise<User[]> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  return usersSnapshot.docs.map(
    (doc) =>
      ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }) as User,
  );
}

/** Fetch quiz preferences for a user by uid. */
export async function getUserQuizPreferences(
  userId: string,
): Promise<QuizPreferences | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return null;
  const quizPreferences = userDoc.data().preferences?.quiz;
  return quizPreferences ? normalizeQuizPreferences(quizPreferences) : null;
}

/** Update quiz preferences for a user by uid. */
export async function updateUserQuizPreferences(
  userId: string,
  preferences: QuizPreferences,
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    "preferences.quiz": preferences,
  });
}

// Learning progress operations
/** Fetch learning progress for a specific species/name variant. */
export async function getLearningProgress(
  userId: string,
  speciesId: string,
  nameType: LearningNameType,
): Promise<LearningProgress | null> {
  const docId = buildLearningProgressDocId(userId, speciesId, nameType);
  const progressDoc = await getDoc(doc(db, "learningProgress", docId));
  if (!progressDoc.exists()) return null;

  const data = progressDoc.data();
  return {
    id: progressDoc.id,
    userId: data.userId,
    speciesId: data.speciesId,
    nameType: data.nameType as LearningNameType,
    accuracyStabilityDays: data.accuracyStabilityDays ?? 0.5,
    speedStabilityDays: data.speedStabilityDays ?? 0.5,
    lastReviewedAt: data.lastReviewedAt?.toDate() ?? new Date(0),
    reviewCount: data.reviewCount ?? 0,
    averageResponseMs: data.averageResponseMs ?? 0,
  } as LearningProgress;
}

/** Fetch learning progress records for a set of species ids. */
export async function getLearningProgressForSpeciesIds(
  userId: string,
  speciesIds: string[],
): Promise<Map<string, LearningProgressState>> {
  const progressMap = new Map<string, LearningProgressState>();
  if (speciesIds.length === 0) return progressMap;

  const chunks = chunkArray(speciesIds, 10);
  for (const chunk of chunks) {
    const snapshot = await getDocs(
      query(
        collection(db, "learningProgress"),
        where("userId", "==", userId),
        where("speciesId", "in", chunk),
      ),
    );

    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const speciesId = data.speciesId as string;
      const nameType = data.nameType as LearningNameType;
      const key = `${speciesId}_${nameType}`;
      progressMap.set(key, {
        accuracyStabilityDays: data.accuracyStabilityDays ?? 0.5,
        speedStabilityDays: data.speedStabilityDays ?? 0.5,
        lastReviewedAt: data.lastReviewedAt?.toDate() ?? new Date(0),
        reviewCount: data.reviewCount ?? 0,
        averageResponseMs: data.averageResponseMs ?? 0,
      });
    });
  }

  return progressMap;
}

/** Batch upsert learning progress records for a user. */
export async function upsertLearningProgressBatch(
  records: Omit<LearningProgress, "id">[],
): Promise<void> {
  if (!records.length) return;
  const batch = writeBatch(db);

  for (const record of records) {
    const docId = buildLearningProgressDocId(
      record.userId,
      record.speciesId,
      record.nameType,
    );
    batch.set(
      doc(db, "learningProgress", docId),
      {
        ...record,
        lastReviewedAt: Timestamp.fromDate(record.lastReviewedAt),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

/** Fetch stack learning histograms for a user. */
export async function getStackLearningHistograms(
  userId: string,
  stackIds: string[],
): Promise<Map<string, StackLearningHistogram>> {
  const histogramMap = new Map<string, StackLearningHistogram>();
  if (stackIds.length === 0) return histogramMap;

  const chunks = chunkArray(stackIds, 10);
  for (const chunk of chunks) {
    const snapshot = await getDocs(
      query(
        collection(db, "stackLearningHistograms"),
        where("userId", "==", userId),
        where("stackId", "in", chunk),
      ),
    );

    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const stackId = data.stackId as string;
      histogramMap.set(stackId, {
        id: docSnapshot.id,
        userId: data.userId,
        stackId,
        scientific: data.scientific,
        vernacular: data.vernacular,
        updatedAt: data.updatedAt?.toDate() ?? new Date(0),
      } as StackLearningHistogram);
    });
  }

  return histogramMap;
}

/** Upsert a stack learning histogram record. */
export async function upsertStackLearningHistogram(
  record: Omit<StackLearningHistogram, "id">,
): Promise<StackLearningHistogram> {
  const docId = `${record.userId}_${record.stackId}`;
  const now = Timestamp.now();
  await setDoc(
    doc(db, "stackLearningHistograms", docId),
    {
      userId: record.userId,
      stackId: record.stackId,
      scientific: record.scientific,
      vernacular: record.vernacular,
      updatedAt: now,
    },
    { merge: true },
  );

  return {
    ...record,
    id: docId,
    updatedAt: now.toDate(),
  };
}

// Group operations
/** Create a new group and return its id. */
export async function createGroup(
  group: Omit<Group, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const groupRef = doc(collection(db, "groups"));
  const newGroup = {
    ...group,
    isHidden: group.isHidden ?? false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(groupRef, newGroup);
  return groupRef.id;
}

/** Fetch groups, optionally filtered by owner and visibility. */
export async function getGroups(
  ownerId?: string,
  options?: { includeHidden?: boolean },
): Promise<Group[]> {
  const includeHidden = options?.includeHidden ?? false;
  let q = query(collection(db, "groups"), orderBy("order"));

  if (ownerId) {
    q = query(
      collection(db, "groups"),
      where("ownerId", "==", ownerId),
      orderBy("order"),
    );
  }

  const snapshot = await getDocs(q);
  const groups = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as Group,
  );
  return includeHidden ? groups : groups.filter((group) => !group.isHidden);
}

/** Fetch a single group by id. */
export async function getGroup(groupId: string): Promise<Group | null> {
  const groupDoc = await getDoc(doc(db, "groups", groupId));
  if (!groupDoc.exists()) return null;

  return {
    id: groupDoc.id,
    ...groupDoc.data(),
    createdAt: groupDoc.data().createdAt?.toDate(),
    updatedAt: groupDoc.data().updatedAt?.toDate(),
  } as Group;
}

/** Update a group with partial fields. */
export async function updateGroup(
  groupId: string,
  updates: Partial<Group>,
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a group document. */
export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, "groups", groupId));
}

// Stack operations
/** Create a stack and link it to the provided groups. */
export async function createStack(
  stack: Omit<Stack, "id" | "createdAt" | "updatedAt">,
  groupIds: string[] = [],
): Promise<string> {
  const stackRef = doc(collection(db, "stacks"));
  const newStack = {
    ...stack,
    isHidden: stack.isHidden ?? false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(stackRef, newStack);

  // Update groups' stackIds in order
  for (const groupId of groupIds) {
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) continue;
    const currentStackIds = groupDoc.data().stackIds || [];
    await updateDoc(doc(db, "groups", groupId), {
      stackIds: [...currentStackIds, stackRef.id],
      updatedAt: Timestamp.now(),
    });
  }

  return stackRef.id;
}

/** Fetch stacks, optionally filtered by group, owner, and visibility. */
export async function getStacks(
  groupId?: string,
  ownerId?: string,
  options?: { includeHidden?: boolean },
): Promise<Stack[]> {
  const includeHidden = options?.includeHidden ?? false;
  if (groupId) {
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) return [];
    if (!includeHidden && groupDoc.data().isHidden) return [];
    const stackIds: string[] = groupDoc.data().stackIds || [];
    if (stackIds.length === 0) return [];

    const stackDocs = await Promise.all(
      stackIds.map((id) => getDoc(doc(db, "stacks", id))),
    );

    const stacks = stackDocs
      .filter((stackDoc) => stackDoc.exists())
      .map(
        (stackDoc) =>
          ({
            id: stackDoc.id,
            ...stackDoc.data(),
            createdAt: stackDoc.data()?.createdAt?.toDate(),
            updatedAt: stackDoc.data()?.updatedAt?.toDate(),
          }) as Stack,
      )
      .filter((stack) => (ownerId ? stack.ownerId === ownerId : true));
    return includeHidden ? stacks : stacks.filter((stack) => !stack.isHidden);
  }

  let q = query(collection(db, "stacks"), orderBy("data.id"));
  if (ownerId) {
    q = query(
      collection(db, "stacks"),
      where("ownerId", "==", ownerId),
      orderBy("data.id"),
    );
  }

  const snapshot = await getDocs(q);
  const stacks = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as Stack,
  );
  return includeHidden ? stacks : stacks.filter((stack) => !stack.isHidden);
}

/** Fetch a single stack by id, respecting visibility by default. */
export async function getStack(
  stackId: string,
  options?: { includeHidden?: boolean },
): Promise<Stack | null> {
  const includeHidden = options?.includeHidden ?? false;
  const stackDoc = await getDoc(doc(db, "stacks", stackId));
  if (!stackDoc.exists()) return null;

  const stack = {
    id: stackDoc.id,
    ...stackDoc.data(),
    createdAt: stackDoc.data().createdAt?.toDate(),
    updatedAt: stackDoc.data().updatedAt?.toDate(),
  } as Stack;
  if (!includeHidden && stack.isHidden) return null;
  return stack;
}

/** Update a stack with partial fields. */
export async function updateStack(
  stackId: string,
  updates: Partial<Stack>,
): Promise<void> {
  await updateDoc(doc(db, "stacks", stackId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a stack document and unlink it from groups. */
export async function deleteStack(stackId: string): Promise<void> {
  const groupQuery = query(
    collection(db, "groups"),
    where("stackIds", "array-contains", stackId),
  );
  const groupSnapshot = await getDocs(groupQuery);

  for (const groupDoc of groupSnapshot.docs) {
    const stackIds = groupDoc.data().stackIds || [];
    await updateDoc(doc(db, "groups", groupDoc.id), {
      stackIds: stackIds.filter((id: string) => id !== stackId),
      updatedAt: Timestamp.now(),
    });
  }

  await deleteDoc(doc(db, "stacks", stackId));
}

/** Update the ordered stack ids for a group. */
export async function updateGroupStackOrder(
  groupId: string,
  stackIds: string[],
): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), {
    stackIds,
    updatedAt: Timestamp.now(),
  });
}

/** Update the ordered species ids for a stack. */
export async function updateStackSpeciesOrder(
  stackId: string,
  speciesIds: string[],
): Promise<void> {
  await updateDoc(doc(db, "stacks", stackId), {
    speciesIds,
    updatedAt: Timestamp.now(),
  });
}

/** Check if a Pinkka group id already exists in Firestore. */
export async function isPinkkaGroupImported(
  groupId: number,
): Promise<boolean> {
  if (pinkkaGroupImportStatusCache.has(groupId)) {
    return pinkkaGroupImportStatusCache.get(groupId) === true;
  }

  return await new Promise((resolve) => {
    const existingResolvers = pendingPinkkaGroupStatusResolvers.get(groupId) ?? [];
    pendingPinkkaGroupStatusResolvers.set(groupId, [...existingResolvers, resolve]);

    if (pendingPinkkaGroupStatusFlush !== undefined) {
      return;
    }

    pendingPinkkaGroupStatusFlush = setTimeout(async () => {
      pendingPinkkaGroupStatusFlush = undefined;
      const entries = [...pendingPinkkaGroupStatusResolvers.entries()];
      pendingPinkkaGroupStatusResolvers.clear();
      const ids = entries.map(([id]) => id);
      const statuses = await getPinkkaGroupImportStatusMap(ids);

      for (const [id, resolvers] of entries) {
        const value = statuses[id] === true;
        resolvers.forEach((resolver) => resolver(value));
      }
    }, 0);
  });
}

/** Check if a Pinkka stack id already exists in Firestore. */
export async function isPinkkaStackImported(
  stackId: number,
  options?: { groupId?: number },
): Promise<boolean> {
  if (pinkkaStackImportStatusCache.has(stackId)) {
    return pinkkaStackImportStatusCache.get(stackId) === true;
  }

  if (options?.groupId === undefined) {
    return false;
  }

  return await new Promise((resolve) => {
    const key = stackStatusKey(options.groupId as number, stackId);
    const existing = pendingPinkkaStackStatusResolvers.get(key);
    if (existing) {
      existing.resolvers.push(resolve);
    } else {
      pendingPinkkaStackStatusResolvers.set(key, {
        groupId: options.groupId as number,
        stackId,
        resolvers: [resolve],
      });
    }

    if (pendingPinkkaStackStatusFlush !== undefined) {
      return;
    }

    pendingPinkkaStackStatusFlush = setTimeout(async () => {
      pendingPinkkaStackStatusFlush = undefined;
      const entries = [...pendingPinkkaStackStatusResolvers.values()];
      pendingPinkkaStackStatusResolvers.clear();

      const idsByGroup = new Map<number, number[]>();
      for (const entry of entries) {
        const current = idsByGroup.get(entry.groupId) ?? [];
        current.push(entry.stackId);
        idsByGroup.set(entry.groupId, current);
      }

      const statusesByGroup = new Map<number, Record<number, boolean>>();
      await Promise.all(
        [...idsByGroup.entries()].map(async ([groupId, stackIds]) => {
          const statuses = await getPinkkaStackImportStatusMap(groupId, stackIds);
          statusesByGroup.set(groupId, statuses);
        }),
      );

      for (const entry of entries) {
        const groupStatuses = statusesByGroup.get(entry.groupId);
        const value = groupStatuses?.[entry.stackId] === true;
        entry.resolvers.forEach((resolver) => resolver(value));
      }
    }, 0);
  });
}

/** Check if a Pinkka species id already exists in Firestore. */
export async function isPinkkaSpeciesImported(
  speciesId: number,
  options?: { groupId?: number; stackId?: number },
): Promise<boolean> {
  if (pinkkaSpeciesImportStatusCache.has(speciesId)) {
    return pinkkaSpeciesImportStatusCache.get(speciesId) === true;
  }

  if (options?.groupId === undefined || options?.stackId === undefined) {
    return false;
  }

  return await new Promise((resolve) => {
    const key = speciesStatusKey(
      options.groupId as number,
      options.stackId as number,
      speciesId,
    );
    const existing = pendingPinkkaSpeciesStatusResolvers.get(key);
    if (existing) {
      existing.resolvers.push(resolve);
    } else {
      pendingPinkkaSpeciesStatusResolvers.set(key, {
        groupId: options.groupId as number,
        stackId: options.stackId as number,
        speciesId,
        resolvers: [resolve],
      });
    }

    if (pendingPinkkaSpeciesStatusFlush !== undefined) {
      return;
    }

    pendingPinkkaSpeciesStatusFlush = setTimeout(async () => {
      pendingPinkkaSpeciesStatusFlush = undefined;
      const entries = [...pendingPinkkaSpeciesStatusResolvers.values()];
      pendingPinkkaSpeciesStatusResolvers.clear();

      const idsByParent = new Map<string, { groupId: number; stackId: number; speciesIds: number[] }>();
      for (const entry of entries) {
        const parentKey = `${entry.groupId}:${entry.stackId}`;
        const existingParent = idsByParent.get(parentKey);
        if (existingParent) {
          existingParent.speciesIds.push(entry.speciesId);
        } else {
          idsByParent.set(parentKey, {
            groupId: entry.groupId,
            stackId: entry.stackId,
            speciesIds: [entry.speciesId],
          });
        }
      }

      const statusesByParent = new Map<string, Record<number, boolean>>();
      await Promise.all(
        [...idsByParent.entries()].map(async ([parentKey, value]) => {
          const statuses = await getPinkkaSpeciesImportStatusMap(
            value.groupId,
            value.stackId,
            value.speciesIds,
          );
          statusesByParent.set(parentKey, statuses);
        }),
      );

      for (const entry of entries) {
        const parentKey = `${entry.groupId}:${entry.stackId}`;
        const parentStatuses = statusesByParent.get(parentKey);
        const value = parentStatuses?.[entry.speciesId] === true;
        entry.resolvers.forEach((resolver) => resolver(value));
      }
    }, 0);
  });
}

// Pinkka import operations
/**
 * Import a Pinkka group with its stacks and species into Firestore under
 * the pinkka hierarchy.
 */
export async function importPinkkaGroup(
  groupId: number,
  ownerId: string,
  options?: { importId?: string; upsert?: boolean },
): Promise<PinkkaImportResult | null> {
  void ownerId;
  void options?.upsert;
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  const group = await fetchPinkkaGroupWithStacks(groupId);
  if (!group) return null;

  const stackEntries = [...(group.subPinkkas ?? [])].sort(
    (a, b) => a.orderNo - b.orderNo,
  );
  const stackIds = stackEntries.map((stack) => String(stack.id));
  const speciesIds: string[] = [];

  await writePinkkaEntity(getPinkkaGroupPath(group.id), group);
  pinkkaGroupImportStatusCache.set(group.id, true);

  for (const stackEntry of stackEntries) {
    const stackDetail = await fetchPinkkaSubStack(stackEntry.id);
    const stackData = stackDetail ?? stackEntry;
    const stackSpeciesCards = stackData.speciesCards ?? [];

    await writePinkkaEntity(
      getPinkkaStackPath(group.id, stackData.id),
      stackData,
    );
    pinkkaStackImportStatusCache.set(stackData.id, true);

    for (const card of stackSpeciesCards) {
      const speciesDetail = await fetchPinkkaSpecies(card.id);
      if (!speciesDetail) continue;
      await writePinkkaEntity(
        getPinkkaSpeciesPath(group.id, stackData.id, card.id),
        speciesDetail,
      );
      pinkkaSpeciesImportStatusCache.set(card.id, true);
      speciesIds.push(String(card.id));
    }
  }

  return {
    importId: resolvedImportId,
    groupId: String(group.id),
    stackIds,
    speciesIds,
  };
}

/**
 * Import a Pinkka stack with its species into Firestore under the pinkka
 * hierarchy.
 */
export async function importPinkkaStack(
  stackId: number,
  ownerId: string,
  options?: { importId?: string; upsert?: boolean; groupId?: number },
): Promise<PinkkaImportResult | null> {
  void ownerId;
  void options?.upsert;
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  const stackDetail = await fetchPinkkaSubStack(stackId);
  if (!stackDetail) return null;
  const resolvedGroupId =
    options?.groupId ?? (await resolveGroupIdForStack(stackId, stackDetail));
  if (resolvedGroupId === null) return null;

  const hierarchy = await writePinkkaGroupAndStackHierarchy({
    groupId: resolvedGroupId,
    stackId: stackDetail.id,
    stackEntity: stackDetail,
  });
  if (!hierarchy) return null;

  pinkkaGroupImportStatusCache.set(resolvedGroupId, true);
  pinkkaStackImportStatusCache.set(stackDetail.id, true);
  const speciesIds: string[] = [];
  const stackSpeciesCards = hierarchy.stack.speciesCards ?? [];

  for (const card of stackSpeciesCards) {
    const speciesDetail = await fetchPinkkaSpecies(card.id);
    if (!speciesDetail) continue;
    await writePinkkaEntity(
      getPinkkaSpeciesPath(resolvedGroupId, hierarchy.stack.id, card.id),
      speciesDetail,
    );
    speciesIds.push(String(card.id));
    pinkkaSpeciesImportStatusCache.set(card.id, true);
  }

  return {
    importId: resolvedImportId,
    groupId: String(resolvedGroupId),
    stackIds: [String(stackDetail.id)],
    speciesIds,
  };
}

/**
 * Import multiple Pinkka stacks with their species into the pinkka hierarchy.
 */
export async function importPinkkaStacks(
  stackIds: number[],
  ownerId: string,
  importId?: string,
  options?: { groupId?: number },
): Promise<PinkkaImportResult[]> {
  const resolvedImportId =
    importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];

  for (const stackId of stackIds) {
    const result = await importPinkkaStack(
      stackId,
      ownerId,
      {
        importId: resolvedImportId,
        upsert: shouldUpsert,
        groupId: options?.groupId,
      },
    );
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Import a single Pinkka species detail into Firestore under the pinkka
 * hierarchy.
 */
export async function importPinkkaSpecies(
  speciesId: number,
  ownerId: string,
  options?: {
    importId?: string;
    upsert?: boolean;
    groupId?: number;
    stackId?: number;
  },
): Promise<PinkkaImportResult | null> {
  void ownerId;
  void options?.upsert;
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  const speciesDetail = await fetchPinkkaSpecies(speciesId);
  if (!speciesDetail) return null;
  const speciesLocation =
    options?.groupId !== undefined && options?.stackId !== undefined
      ? { groupId: options.groupId, stackId: options.stackId }
      : await resolveSpeciesLocation(speciesId);
  if (!speciesLocation) return null;

  const hierarchy = await writePinkkaGroupAndStackHierarchy({
    groupId: speciesLocation.groupId,
    stackId: speciesLocation.stackId,
  });
  if (!hierarchy) return null;

  await writePinkkaEntity(
    getPinkkaSpeciesPath(
      speciesLocation.groupId,
      speciesLocation.stackId,
      speciesId,
    ),
    speciesDetail,
  );
  pinkkaGroupImportStatusCache.set(speciesLocation.groupId, true);
  pinkkaStackImportStatusCache.set(speciesLocation.stackId, true);
  pinkkaSpeciesImportStatusCache.set(speciesId, true);

  return {
    importId: resolvedImportId,
    groupId: String(speciesLocation.groupId),
    stackIds: [String(speciesLocation.stackId)],
    speciesIds: [String(speciesId)],
  };
}

/**
 * Import multiple Pinkka species details into the pinkka hierarchy.
 */
export async function importPinkkaSpeciesList(
  speciesIds: number[],
  ownerId: string,
  importId?: string,
  options?: { groupId?: number; stackId?: number },
): Promise<PinkkaImportResult[]> {
  const resolvedImportId =
    importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];

  for (const speciesId of speciesIds) {
    const result = await importPinkkaSpecies(
      speciesId,
      ownerId,
      {
        importId: resolvedImportId,
        upsert: shouldUpsert,
        groupId: options?.groupId,
        stackId: options?.stackId,
      },
    );
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Import multiple Pinkka groups with their stacks and species into the
 * pinkka hierarchy.
 */
export async function importPinkkaGroups(
  groupIds: number[],
  ownerId: string,
  importId?: string,
): Promise<PinkkaImportResult[]> {
  const resolvedImportId =
    importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];

  for (const groupId of groupIds) {
    const result = await importPinkkaGroup(
      groupId,
      ownerId,
      { importId: resolvedImportId, upsert: shouldUpsert },
    );
    if (result) {
      results.push(result);
    }
  }

  return results;
}

// Species operations
/** Create a species and link it to the provided stacks. */
export async function createSpecies(
  species: Omit<Species, "id" | "createdAt" | "updatedAt">,
  stackIds: string[] = [],
): Promise<string> {
  const speciesRef = doc(collection(db, "species"));
  const newSpecies = {
    ...species,
    isHidden: species.isHidden ?? false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await setDoc(speciesRef, newSpecies);

  // Update stacks' speciesIds in order
  for (const stackId of stackIds) {
    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (!stackDoc.exists()) continue;
    const currentSpeciesIds = stackDoc.data().speciesIds || [];
    await updateDoc(doc(db, "stacks", stackId), {
      speciesIds: [...currentSpeciesIds, speciesRef.id],
      updatedAt: Timestamp.now(),
    });
  }

  return speciesRef.id;
}

/** Fetch species, optionally filtered by stack and visibility. */
export async function getSpecies(
  stackId?: string,
  options?: { includeHidden?: boolean },
): Promise<Species[]> {
  const includeHidden = options?.includeHidden ?? false;
  if (stackId) {
    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (!stackDoc.exists()) return [];
    if (!includeHidden && stackDoc.data().isHidden) return [];
    const speciesIds: string[] = stackDoc.data().speciesIds || [];
    if (speciesIds.length === 0) return [];

    const speciesDocs = await Promise.all(
      speciesIds.map((id) => getDoc(doc(db, "species", id))),
    );

    const species = speciesDocs
      .filter((speciesDoc) => speciesDoc.exists())
      .map(
        (speciesDoc) =>
          ({
            id: speciesDoc.id,
            ...speciesDoc.data(),
            createdAt: speciesDoc.data()?.createdAt?.toDate(),
            updatedAt: speciesDoc.data()?.updatedAt?.toDate(),
          }) as Species,
      );
    return includeHidden ? species : species.filter((item) => !item.isHidden);
  }

  const snapshot = await getDocs(query(collection(db, "species")));
  const species = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }) as Species,
  );
  return includeHidden ? species : species.filter((item) => !item.isHidden);
}

/** Fetch a single species by id. */
export async function getSpeciesById(
  speciesId: string,
): Promise<Species | null> {
  const speciesDoc = await getDoc(doc(db, "species", speciesId));
  if (!speciesDoc.exists()) return null;

  return {
    id: speciesDoc.id,
    ...speciesDoc.data(),
    createdAt: speciesDoc.data().createdAt?.toDate(),
    updatedAt: speciesDoc.data().updatedAt?.toDate(),
  } as Species;
}

/** Update a species with partial fields. */
export async function updateSpecies(
  speciesId: string,
  updates: Partial<Species>,
): Promise<void> {
  await updateDoc(doc(db, "species", speciesId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a species and its stored images. */
export async function deleteSpecies(speciesId: string): Promise<void> {
  const speciesDoc = await getDoc(doc(db, "species", speciesId));

  if (speciesDoc.exists()) {
    // Delete all images from storage
    const images = speciesDoc.data().data?.images || [];
    for (const image of images) {
      try {
        const urls = image.urls || {};
        const urlList = Object.values(urls).filter(Boolean) as string[];
        for (const url of urlList) {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }

    // Remove from stacks' speciesIds
    const stackQuery = query(
      collection(db, "stacks"),
      where("speciesIds", "array-contains", speciesId),
    );
    const stackSnapshot = await getDocs(stackQuery);
    for (const stackDoc of stackSnapshot.docs) {
      const speciesIds = stackDoc.data().speciesIds || [];
      await updateDoc(doc(db, "stacks", stackDoc.id), {
        speciesIds: speciesIds.filter((id: string) => id !== speciesId),
        updatedAt: Timestamp.now(),
      });
    }
  }

  await deleteDoc(doc(db, "species", speciesId));
}

// Image operations
/** Upload an image to storage and return its metadata. */
export async function uploadSpeciesImage(
  speciesId: string,
  file: File,
  _order: number,
): Promise<SpeciesImage> {
  const imageId = `${speciesId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const imageRef = ref(storage, `species/${speciesId}/${imageId}`);

  await uploadBytes(imageRef, file);
  const url = await getDownloadURL(imageRef);

  return {
    id: imageId,
    urls: {
      original: url,
      full: url,
      large: url,
      square: url,
      thumbnail: url,
    },
  };
}

/** Delete an image from storage and update species metadata. */
export async function deleteSpeciesImage(
  speciesId: string,
  imageUrl: string,
): Promise<void> {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);

    // Update species document to remove image
    const speciesDoc = await getDoc(doc(db, "species", speciesId));
    if (speciesDoc.exists()) {
      const images = speciesDoc.data().data?.images || [];
      const updatedImages = images.filter((img: SpeciesImage) => {
        const urls = img.urls || {};
        return !Object.values(urls).includes(imageUrl);
      });
      await updateDoc(doc(db, "species", speciesId), {
        "data.images": updatedImages,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}

// Batch reordering
/** Update ordering fields for a list of items in a collection. */
export async function reorderItems(
  collectionName: string,
  items: { id: string; order: number }[],
): Promise<void> {
  const batch = writeBatch(db);

  items.forEach((item) => {
    const docRef = doc(db, collectionName, item.id);
    batch.update(docRef, { order: item.order, updatedAt: Timestamp.now() });
  });

  await batch.commit();
}
