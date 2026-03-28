/** Firestore CRUD, content aggregation, and Pinkka import helpers for management flows. */

import {
  collection,
  collectionGroup,
  doc,
  documentId,
  deleteField,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  Timestamp,
  writeBatch,
  type DocumentData,
  type DocumentReference,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase-config";
import type {
  ContentSourceRecord,
  GlobalScientificProgress,
  GroupData,
  GroupScientificProgress,
  HomePreferences,
  LearningItem,
  LearningItemData,
  LearningStatusHistogram,
  LearningNameType,
  LearningProgress,
  LearningProgressState,
  StackScientificProgress,
  StackLearningHistogram,
  TestPreferences,
  Species,
  Stack,
  StackData,
  Group,
  SpeciesImage,
  EntityImage,
  SpeciesData,
  User,
} from "../types";
import { normalizeTestPreferences } from "../tests/test-preferences";
import { buildStackLearningHistogram } from "../learning/learning-histogram";
import {
  fetchPinkkaGroupWithStacks,
  fetchPinkkaGroups,
  fetchPinkkaSpecies,
  fetchPinkkaSubStack,
  type PinkkaGroup,
  type PinkkaImageAsset,
  type PinkkaSpeciesCard,
  type PinkkaSpeciesDetail,
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
  /** Imported learning-item document ids. */
  learningItemIds: string[];
  /** Imported species document ids. */
  speciesIds: string[];
}

/** Progress state for one Pinkka entity level. */
export interface PinkkaImportProgressLevel {
  /** Number of completed entities. */
  completed: number;
  /** Total number of entities to import. */
  total: number;
  /** Name of the entity currently being imported. */
  currentEntityName: string;
  /** Completed image downloads for the current entity. */
  imageDownloadsCompleted: number;
  /** Total image downloads for the current entity. */
  imageDownloadsTotal: number;
}

/** Hierarchical Pinkka import progress state. */
export interface PinkkaImportProgress {
  /** Group-level progress. */
  groups: PinkkaImportProgressLevel;
  /** Stack-level progress. */
  stacks: PinkkaImportProgressLevel;
  /** Species-level progress. */
  species: PinkkaImportProgressLevel;
}

/** Callback for receiving Pinkka import progress updates. */
export type PinkkaImportProgressCallback = (
  progress: PinkkaImportProgress,
) => void;

/** Import status for a Pinkka entity document. */
export interface PinkkaImportStatus {
  /** Whether the entity has any Pinkka import document in Firestore. */
  isImported: boolean;
  /** Whether the entity import is currently incomplete. */
  isIncomplete: boolean;
}

/** Imported Pinkka group entry available for creating editable groups. */
export interface ImportedPinkkaGroupEntry {
  /** Numeric Pinkka group id. */
  groupId: number;
  /** Original Pinkka group payload. */
  entity: PinkkaGroup;
  /** Number of stacks in the imported group payload. */
  stackCount: number;
  /** Whether the imported group is currently incomplete. */
  isIncomplete: boolean;
}

/** Imported Pinkka species entry available for creating editable species. */
export interface ImportedPinkkaSpeciesEntry {
  /** Numeric Pinkka species id. */
  speciesId: number;
  /** Original Pinkka species payload. */
  entity: PinkkaSpeciesDetail;
}

const PINKKA_SPECIES_FETCH_CONCURRENCY = 8;
const PINKKA_STACK_SPECIES_FETCH_CONCURRENCY = 2;

/** Normalize stored preference ids into a unique string array. */
function normalizePreferenceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((entry): entry is string => typeof entry === "string"),
    ),
  ];
}

/** Imported Pinkka stack entry available for creating editable stacks. */
export interface ImportedPinkkaStackEntry {
  /** Numeric Pinkka stack id. */
  stackId: number;
  /** Original Pinkka stack payload. */
  entity: PinkkaSubStack;
}

/** Result summary for creating editable content from one imported Pinkka group. */
export interface CreateGroupFromPinkkaImportResult {
  /** Created editable group id. */
  groupId: string;
  /** Number of created stacks. */
  createdStackCount: number;
  /** Number of created canonical learning items. */
  createdSpeciesCount: number;
}

/** Result summary for refreshing one editable group from linked Pinkka data. */
export interface RefreshGroupFromPinkkaResult {
  /** Number of newly created stacks. */
  createdStackCount: number;
  /** Number of updated existing stacks. */
  updatedStackCount: number;
  /** Number of removed linked stacks no longer present in Pinkka. */
  deletedStackCount: number;
  /** Number of newly created species. */
  createdSpeciesCount: number;
  /** Number of updated existing species. */
  updatedSpeciesCount: number;
  /** Number of removed linked species no longer present in Pinkka. */
  deletedSpeciesCount: number;
}

/** Result summary for refreshing one editable stack from linked Pinkka data. */
export interface RefreshStackFromPinkkaResult {
  /** Number of newly created species. */
  createdSpeciesCount: number;
  /** Number of updated existing species. */
  updatedSpeciesCount: number;
  /** Number of removed linked species no longer present in Pinkka. */
  deletedSpeciesCount: number;
}

/** User-facing message for manual interruption. */
export const PINKKA_IMPORT_INTERRUPTED_ERROR_MESSAGE =
  "Pinkka import interrupted.";

/** Check whether an error indicates user-requested Pinkka import interruption. */
export function isPinkkaImportInterruptedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === PINKKA_IMPORT_INTERRUPTED_ERROR_MESSAGE
  );
}

const NOT_IMPORTED_STATUS: PinkkaImportStatus = Object.freeze({
  isImported: false,
  isIncomplete: false,
});

const IMPORTED_COMPLETE_STATUS: PinkkaImportStatus = Object.freeze({
  isImported: true,
  isIncomplete: false,
});

const IMPORTED_INCOMPLETE_STATUS: PinkkaImportStatus = Object.freeze({
  isImported: true,
  isIncomplete: true,
});

const pinkkaGroupImportStatusCache = new Map<number, PinkkaImportStatus>();
const pinkkaStackImportStatusCache = new Map<number, PinkkaImportStatus>();
const pinkkaSpeciesImportStatusCache = new Map<number, PinkkaImportStatus>();
const PINKKA_COLLECTION = "pinkka";
const FIRESTORE_IN_QUERY_MAX = 10;

type Resolver<T> = (value: T) => void;

const pendingPinkkaGroupStatusResolvers = new Map<
  number,
  Resolver<PinkkaImportStatus>[]
>();
let pendingPinkkaGroupStatusFlush: ReturnType<typeof setTimeout> | undefined;

type PendingStackStatus = {
  groupId: number;
  stackId: number;
  resolvers: Resolver<PinkkaImportStatus>[];
};

const pendingPinkkaStackStatusResolvers = new Map<string, PendingStackStatus>();
let pendingPinkkaStackStatusFlush: ReturnType<typeof setTimeout> | undefined;

type PendingSpeciesStatus = {
  groupId: number;
  stackId: number;
  speciesId: number;
  resolvers: Resolver<PinkkaImportStatus>[];
};

const pendingPinkkaSpeciesStatusResolvers = new Map<
  string,
  PendingSpeciesStatus
>();
let pendingPinkkaSpeciesStatusFlush: ReturnType<typeof setTimeout> | undefined;
const pinkkaImportedImageUrlCache = new Map<string, string>();
type CachedNestedStackLocation = {
  groupId: string;
};

type CachedNestedSpeciesLocation = {
  groupId: string;
  stackId: string;
};

const nestedStackLocationCache = new Map<string, CachedNestedStackLocation>();
const nestedSpeciesLocationCache = new Map<
  string,
  CachedNestedSpeciesLocation
>();
const CANONICAL_LEARNING_ITEMS_COLLECTION = "learning-items";
const LEGACY_CANONICAL_SPECIES_COLLECTION = "species";
const STACK_LEARNING_ITEM_IDS_FIELD = "learningItemIds";
const LEGACY_STACK_SPECIES_IDS_FIELD = "speciesIds";
const NANOID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
const NANOID_SIZE = 21;

type PinkkaImportProgressContext = {
  progress: PinkkaImportProgress;
  mode: "groups" | "stacks" | "species";
  onProgress?: PinkkaImportProgressCallback;
  shouldInterrupt?: () => boolean;
  completedGroupIds: Set<number>;
  completedStackKeys: Set<string>;
};

type PinkkaImportControlOptions = {
  onProgress?: PinkkaImportProgressCallback;
  shouldInterrupt?: () => boolean;
  force?: boolean;
};

function createPinkkaImportProgressContext(params: {
  mode: "groups" | "stacks" | "species";
  onProgress?: PinkkaImportProgressCallback;
  shouldInterrupt?: () => boolean;
  initialProgress?: {
    groups?: Partial<PinkkaImportProgressLevel>;
    stacks?: Partial<PinkkaImportProgressLevel>;
    species?: Partial<PinkkaImportProgressLevel>;
  };
}): PinkkaImportProgressContext {
  const progress = createInitialPinkkaImportProgress();
  if (params.initialProgress) {
    progress.groups = {
      ...progress.groups,
      ...params.initialProgress.groups,
    };
    progress.stacks = {
      ...progress.stacks,
      ...params.initialProgress.stacks,
    };
    progress.species = {
      ...progress.species,
      ...params.initialProgress.species,
    };
  }

  return {
    progress,
    mode: params.mode,
    onProgress: params.onProgress,
    shouldInterrupt: params.shouldInterrupt,
    completedGroupIds: new Set<number>(),
    completedStackKeys: new Set<string>(),
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const FIRESTORE_BATCH_WRITE_MAX = 100;
const FIRESTORE_COMMIT_PAYLOAD_TARGET_BYTES = 6 * 1024 * 1024;
const FIRESTORE_BATCH_COMMIT_COOLDOWN_MS = 25;
const FIRESTORE_BATCH_RETRY_BASE_DELAY_MS = 250;
const FIRESTORE_BATCH_RETRY_MAX_ATTEMPTS = 4;
const PINKKA_IMPORT_SMALL_BATCH_WRITE_MAX = 20;
const PINKKA_IMPORT_SMALL_BATCH_COMMIT_COOLDOWN_MS = 100;
const PINKKA_IMPORT_MEDIUM_BATCH_WRITE_MAX = 10;
const PINKKA_IMPORT_MEDIUM_BATCH_COMMIT_COOLDOWN_MS = 250;
const PINKKA_IMPORT_LARGE_BATCH_WRITE_MAX = 5;
const PINKKA_IMPORT_LARGE_BATCH_COMMIT_COOLDOWN_MS = 400;
const firestorePayloadSizeEncoder = new TextEncoder();

type BatchSetOperation = {
  ref: DocumentReference;
  data: Record<string, unknown>;
};

type BatchCommitOptions = {
  maxOperationsPerBatch?: number;
  cooldownMs?: number;
};

const PINKKA_IMPORT_BATCH_COMMIT_OPTIONS: BatchCommitOptions = {
  maxOperationsPerBatch: PINKKA_IMPORT_SMALL_BATCH_WRITE_MAX,
  cooldownMs: PINKKA_IMPORT_SMALL_BATCH_COMMIT_COOLDOWN_MS,
};

function getPinkkaImportBatchCommitOptions(
  operationCount: number,
): BatchCommitOptions {
  if (operationCount >= 150) {
    return {
      maxOperationsPerBatch: PINKKA_IMPORT_LARGE_BATCH_WRITE_MAX,
      cooldownMs: PINKKA_IMPORT_LARGE_BATCH_COMMIT_COOLDOWN_MS,
    };
  }

  if (operationCount >= 50) {
    return {
      maxOperationsPerBatch: PINKKA_IMPORT_MEDIUM_BATCH_WRITE_MAX,
      cooldownMs: PINKKA_IMPORT_MEDIUM_BATCH_COMMIT_COOLDOWN_MS,
    };
  }

  return PINKKA_IMPORT_BATCH_COMMIT_OPTIONS;
}

async function waitForPinkkaImportCommitDrain(
  operationCount: number,
): Promise<void> {
  if (operationCount >= 150) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return;
  }

  if (operationCount >= 50) {
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
}

function estimateBatchSetOperationSize(operation: BatchSetOperation): number {
  return firestorePayloadSizeEncoder.encode(
    JSON.stringify({
      path: operation.ref.path,
      data: operation.data,
    }),
  ).length;
}

function isFirestoreRetriableCommitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  return [
    "resource-exhausted",
    "aborted",
    "deadline-exceeded",
    "unavailable",
  ].includes(code);
}

async function waitForFirestoreCommitRetry(attempt: number): Promise<void> {
  const delayMs =
    FIRESTORE_BATCH_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function commitBatchWithAdaptiveRetry(
  commit: () => Promise<void>,
): Promise<void> {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= FIRESTORE_BATCH_RETRY_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await commit();
      return;
    } catch (error) {
      lastError = error;
      if (
        attempt >= FIRESTORE_BATCH_RETRY_MAX_ATTEMPTS ||
        !isFirestoreRetriableCommitError(error)
      ) {
        break;
      }
      await waitForFirestoreCommitRetry(attempt);
    }
  }

  throw lastError;
}

async function commitSetOperationsInBatches(
  operations: BatchSetOperation[],
  options?: BatchCommitOptions,
): Promise<void> {
  const maxOperationsPerBatch = Math.min(
    options?.maxOperationsPerBatch ?? FIRESTORE_BATCH_WRITE_MAX,
    FIRESTORE_BATCH_WRITE_MAX,
  );
  const cooldownMs = options?.cooldownMs ?? FIRESTORE_BATCH_COMMIT_COOLDOWN_MS;
  const batches: BatchSetOperation[][] = [];
  let currentBatch: BatchSetOperation[] = [];
  let currentBatchSize = 0;

  for (const operation of operations) {
    const operationSize = estimateBatchSetOperationSize(operation);

    // Keep commits comfortably below Firestore's request payload limit.
    if (
      currentBatch.length > 0 &&
      (currentBatch.length >= maxOperationsPerBatch ||
        currentBatchSize + operationSize >
          FIRESTORE_COMMIT_PAYLOAD_TARGET_BYTES)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    currentBatch.push(operation);
    currentBatchSize += operationSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const chunk = batches[batchIndex];
    try {
      await commitBatchWithAdaptiveRetry(async () => {
        const batch = writeBatch(db);
        for (const operation of chunk) {
          batch.set(operation.ref, operation.data);
        }
        await batch.commit();
      });
    } catch (error) {
      console.error(
        "[Firestore] Batch set commit failed; retrying operations individually",
        {
          batchIndex,
          refs: chunk.map((operation) => operation.ref.path),
          error,
        },
      );
      for (const operation of chunk) {
        try {
          await setDoc(operation.ref, operation.data);
        } catch (operationError) {
          console.error("[Firestore] Individual set operation failed", {
            ref: operation.ref.path,
            error: operationError,
          });
          throw operationError;
        }
      }
    }
    if (batchIndex < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, cooldownMs));
    }
  }
}

async function commitDeleteReferencesInBatches(
  refs: DocumentReference[],
  options?: BatchCommitOptions,
): Promise<void> {
  const maxOperationsPerBatch = Math.min(
    options?.maxOperationsPerBatch ?? FIRESTORE_BATCH_WRITE_MAX,
    FIRESTORE_BATCH_WRITE_MAX,
  );
  const cooldownMs = options?.cooldownMs ?? FIRESTORE_BATCH_COMMIT_COOLDOWN_MS;
  const refChunks = chunkArray(refs, maxOperationsPerBatch);
  for (let chunkIndex = 0; chunkIndex < refChunks.length; chunkIndex += 1) {
    const chunk = refChunks[chunkIndex];
    try {
      await commitBatchWithAdaptiveRetry(async () => {
        const batch = writeBatch(db);
        for (const refToDelete of chunk) {
          batch.delete(refToDelete);
        }
        await batch.commit();
      });
    } catch (error) {
      console.error(
        "[Firestore] Batch delete commit failed; retrying operations individually",
        {
          refs: chunk.map((refToDelete) => refToDelete.path),
          error,
        },
      );
      for (const refToDelete of chunk) {
        try {
          await deleteDoc(refToDelete);
        } catch (operationError) {
          console.error("[Firestore] Individual delete operation failed", {
            ref: refToDelete.path,
            error: operationError,
          });
          throw operationError;
        }
      }
    }
    if (chunkIndex < refChunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, cooldownMs));
    }
  }
}

function collectSpeciesImageUrls(data: DocumentData): string[] {
  const images = data.data?.images;
  if (!Array.isArray(images)) {
    return [];
  }

  const urls = new Set<string>();
  for (const image of images) {
    if (typeof image !== "object" || image === null) {
      continue;
    }

    const imageUrls = (image as { urls?: Record<string, unknown> }).urls;
    if (!imageUrls || typeof imageUrls !== "object") {
      continue;
    }

    for (const value of Object.values(imageUrls)) {
      if (typeof value === "string" && value.length > 0) {
        urls.add(value);
      }
    }
  }

  return [...urls];
}

async function deleteSpeciesImagesFromDocumentData(
  speciesData: DocumentData,
): Promise<void> {
  const imageUrls = collectSpeciesImageUrls(speciesData);
  for (const imageUrl of imageUrls) {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }
}

function toUniqueIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

function createEmptyProgressLevel(): PinkkaImportProgressLevel {
  return {
    completed: 0,
    total: 0,
    currentEntityName: "",
    imageDownloadsCompleted: 0,
    imageDownloadsTotal: 0,
  };
}

function createInitialPinkkaImportProgress(): PinkkaImportProgress {
  return {
    groups: createEmptyProgressLevel(),
    stacks: createEmptyProgressLevel(),
    species: createEmptyProgressLevel(),
  };
}

function clonePinkkaImportProgress(
  progress: PinkkaImportProgress,
): PinkkaImportProgress {
  return {
    groups: { ...progress.groups },
    stacks: { ...progress.stacks },
    species: { ...progress.species },
  };
}

function assertPinkkaImportNotInterrupted(
  context?: PinkkaImportProgressContext,
): void {
  if (context?.shouldInterrupt?.() !== true) {
    return;
  }
  throw new Error(PINKKA_IMPORT_INTERRUPTED_ERROR_MESSAGE);
}

function emitPinkkaImportProgress(context?: PinkkaImportProgressContext): void {
  context?.onProgress?.(clonePinkkaImportProgress(context.progress));
}

function extendPinkkaImportProgressTotals(
  context: PinkkaImportProgressContext | undefined,
  totals: Partial<Record<keyof PinkkaImportProgress, number>>,
): void {
  if (!context) {
    return;
  }

  if (typeof totals.groups === "number") {
    context.progress.groups.total += totals.groups;
  }
  if (typeof totals.stacks === "number") {
    context.progress.stacks.total += totals.stacks;
  }
  if (typeof totals.species === "number") {
    context.progress.species.total += totals.species;
  }

  emitPinkkaImportProgress(context);
}

function getMultilingualName(
  value: { fi?: string; en?: string; sv?: string } | undefined,
  fallback: string,
): string {
  return value?.fi || value?.en || value?.sv || fallback;
}

function getPinkkaGroupDisplayName(group: PinkkaGroup): string {
  return getMultilingualName(group.name, `Group ${group.id}`);
}

function getPinkkaStackDisplayName(stack: PinkkaSubStack): string {
  return getMultilingualName(stack.name, `Stack ${stack.id}`);
}

function getPinkkaSpeciesDisplayName(
  speciesId: number,
  detail: PinkkaSpeciesDetail,
): string {
  return detail.scientificName || `Species ${speciesId}`;
}

function updateCurrentEntityProgress(
  context: PinkkaImportProgressContext | undefined,
  level: keyof PinkkaImportProgress,
  name: string,
  imageTotal = 0,
): void {
  if (!context) {
    return;
  }
  const targetLevel = context.progress[level];
  targetLevel.currentEntityName = name;
  targetLevel.imageDownloadsCompleted = 0;
  targetLevel.imageDownloadsTotal = imageTotal;
  emitPinkkaImportProgress(context);
}

function markGroupCompleted(
  context: PinkkaImportProgressContext | undefined,
  groupId: number,
  groupName: string,
): void {
  if (!context || context.completedGroupIds.has(groupId)) {
    return;
  }
  context.completedGroupIds.add(groupId);
  context.progress.groups.currentEntityName = groupName;
  context.progress.groups.completed += 1;
  if (context.progress.groups.completed > context.progress.groups.total) {
    context.progress.groups.total = context.progress.groups.completed;
  }
  emitPinkkaImportProgress(context);
}

function markStackCompleted(
  context: PinkkaImportProgressContext | undefined,
  groupId: number,
  stackId: number,
  stackName: string,
): void {
  if (!context) {
    return;
  }
  const key = stackStatusKey(groupId, stackId);
  if (context.completedStackKeys.has(key)) {
    return;
  }
  context.completedStackKeys.add(key);
  context.progress.stacks.currentEntityName = stackName;
  context.progress.stacks.completed += 1;
  if (context.progress.stacks.completed > context.progress.stacks.total) {
    context.progress.stacks.total = context.progress.stacks.completed;
  }
  emitPinkkaImportProgress(context);
}

function hasImportStartedFlag(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "importStarted" in data &&
    (data as { importStarted?: unknown }).importStarted !== undefined
  );
}

function getPinkkaImportStatusFromDocData(data: unknown): PinkkaImportStatus {
  const importStarted = hasImportStartedFlag(data);

  return importStarted ? IMPORTED_INCOMPLETE_STATUS : IMPORTED_COMPLETE_STATUS;
}

/** List fully imported Pinkka groups from the pinkka hierarchy. */
export async function getImportedPinkkaGroups(): Promise<
  ImportedPinkkaGroupEntry[]
> {
  const groups = await fetchPinkkaGroups();
  const groupIds = groups
    .map((group) => group.id)
    .filter((groupId): groupId is number => Number.isFinite(groupId));
  const statusMap = await getPinkkaGroupImportStateMap(groupIds);

  return groups
    .map((group) => ({
      groupId: group.id,
      entity: group as PinkkaGroup,
      stackCount: group.subPinkkas?.length ?? 0,
      isIncomplete: statusMap[group.id]?.isIncomplete === true,
    }))
    .sort((left, right) => left.groupId - right.groupId);
}

/** List imported Pinkka species for a group stack from the pinkka hierarchy. */
export async function getImportedPinkkaSpeciesEntries(
  groupId: number,
  stackId: number,
): Promise<ImportedPinkkaSpeciesEntry[]> {
  void groupId;
  const results: ImportedPinkkaSpeciesEntry[] = [];
  const stack = await fetchPinkkaSubStack(stackId);
  if (!stack) {
    return results;
  }

  for (const speciesChunk of chunkArray(
    stack.speciesCards ?? [],
    PINKKA_SPECIES_FETCH_CONCURRENCY,
  )) {
    const speciesDetails = await Promise.all(
      speciesChunk.map(async (card) => ({
        speciesId: card.id,
        entity: await fetchPinkkaSpecies(card.id),
      })),
    );
    for (const entry of speciesDetails) {
      if (!entry.entity) {
        continue;
      }
      results.push({
        speciesId: entry.speciesId,
        entity: entry.entity,
      });
    }
  }

  results.sort((left, right) =>
    left.entity.scientificName.localeCompare(right.entity.scientificName),
  );
  return results;
}

async function getImportedPinkkaSpeciesEntriesByStack(params: {
  groupId: number;
  sourceStacks: PinkkaSubStack[];
}): Promise<Map<number, ImportedPinkkaSpeciesEntry[]>> {
  const importedSpeciesMap = new Map<number, ImportedPinkkaSpeciesEntry[]>();

  for (const stackChunk of chunkArray(
    params.sourceStacks,
    PINKKA_STACK_SPECIES_FETCH_CONCURRENCY,
  )) {
    const importedSpeciesByStack = await Promise.all(
      stackChunk.map(async (sourceStack) => ({
        stackId: sourceStack.id,
        entries: await getImportedPinkkaSpeciesEntries(
          params.groupId,
          sourceStack.id,
        ),
      })),
    );

    for (const entry of importedSpeciesByStack) {
      importedSpeciesMap.set(entry.stackId, entry.entries);
    }
  }

  return importedSpeciesMap;
}

/** List imported Pinkka stacks for a group from the pinkka hierarchy. */
export async function getImportedPinkkaStackEntries(
  groupId: number,
): Promise<ImportedPinkkaStackEntry[]> {
  const group = await fetchPinkkaGroupWithStacks(groupId);
  if (!group) {
    return [];
  }

  return [...(group.subPinkkas ?? [])]
    .map((stack) => ({
      stackId: stack.id,
      entity: stack,
    }))
    .sort(
      (left, right) => (left.entity.orderNo ?? 0) - (right.entity.orderNo ?? 0),
    );
}

/** Fetch import state for Pinkka groups in batch. */
export async function getPinkkaGroupImportStateMap(
  groupIds: number[],
): Promise<Record<number, PinkkaImportStatus>> {
  const uniqueIds = toUniqueIds(groupIds);
  const statuses: Record<number, PinkkaImportStatus> = {};
  if (uniqueIds.length === 0) {
    return statuses;
  }

  const missingIds = uniqueIds.filter((groupId) => {
    const cached = pinkkaGroupImportStatusCache.get(groupId);
    if (cached !== undefined) {
      statuses[groupId] = cached;
      return false;
    }
    return true;
  });

  for (const chunk of chunkArray(missingIds, FIRESTORE_IN_QUERY_MAX)) {
    const snapshot = await getDocs(
      query(
        collection(db, PINKKA_COLLECTION),
        where(
          documentId(),
          "in",
          chunk.map((groupId) => String(groupId)),
        ),
      ),
    );
    const statusById = new Map<number, PinkkaImportStatus>();
    snapshot.docs.forEach((docSnapshot) => {
      const pinkkaGroupId = Number.parseInt(docSnapshot.id, 10);
      if (Number.isFinite(pinkkaGroupId)) {
        statusById.set(
          pinkkaGroupId,
          getPinkkaImportStatusFromDocData(docSnapshot.data()),
        );
      }
    });

    chunk.forEach((groupId) => {
      const status = statusById.get(groupId) ?? NOT_IMPORTED_STATUS;
      statuses[groupId] = status;
      pinkkaGroupImportStatusCache.set(groupId, status);
    });
  }

  return statuses;
}

/** Fetch import state for Pinkka stacks in a group, in batch. */
export async function getPinkkaStackImportStateMap(
  groupId: number,
  stackIds: number[],
): Promise<Record<number, PinkkaImportStatus>> {
  const uniqueIds = toUniqueIds(stackIds);
  const statuses: Record<number, PinkkaImportStatus> = {};
  if (uniqueIds.length === 0) {
    return statuses;
  }

  const missingIds = uniqueIds.filter((stackId) => {
    const cached = pinkkaStackImportStatusCache.get(stackId);
    if (cached !== undefined) {
      statuses[stackId] = cached;
      return false;
    }
    return true;
  });

  for (const chunk of chunkArray(missingIds, FIRESTORE_IN_QUERY_MAX)) {
    const snapshot = await getDocs(
      query(
        collection(db, PINKKA_COLLECTION, String(groupId), "stacks"),
        where(
          documentId(),
          "in",
          chunk.map((stackId) => String(stackId)),
        ),
      ),
    );
    const statusById = new Map<number, PinkkaImportStatus>();
    snapshot.docs.forEach((docSnapshot) => {
      const pinkkaStackId = Number.parseInt(docSnapshot.id, 10);
      if (Number.isFinite(pinkkaStackId)) {
        statusById.set(
          pinkkaStackId,
          getPinkkaImportStatusFromDocData(docSnapshot.data()),
        );
      }
    });

    chunk.forEach((stackId) => {
      const status = statusById.get(stackId) ?? NOT_IMPORTED_STATUS;
      statuses[stackId] = status;
      pinkkaStackImportStatusCache.set(stackId, status);
    });
  }

  return statuses;
}

/** Fetch import state for Pinkka species in a stack, in batch. */
export async function getPinkkaSpeciesImportStateMap(
  groupId: number,
  stackId: number,
  speciesIds: number[],
): Promise<Record<number, PinkkaImportStatus>> {
  const uniqueIds = toUniqueIds(speciesIds);
  const statuses: Record<number, PinkkaImportStatus> = {};
  if (uniqueIds.length === 0) {
    return statuses;
  }

  const missingIds = uniqueIds.filter((speciesId) => {
    const cached = pinkkaSpeciesImportStatusCache.get(speciesId);
    if (cached !== undefined) {
      statuses[speciesId] = cached;
      return false;
    }
    return true;
  });

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
        where(
          documentId(),
          "in",
          chunk.map((speciesId) => String(speciesId)),
        ),
      ),
    );
    const statusById = new Map<number, PinkkaImportStatus>();
    snapshot.docs.forEach((docSnapshot) => {
      const pinkkaSpeciesId = Number.parseInt(docSnapshot.id, 10);
      if (Number.isFinite(pinkkaSpeciesId)) {
        statusById.set(
          pinkkaSpeciesId,
          getPinkkaImportStatusFromDocData(docSnapshot.data()),
        );
      }
    });

    chunk.forEach((speciesId) => {
      const status = statusById.get(speciesId) ?? NOT_IMPORTED_STATUS;
      statuses[speciesId] = status;
      pinkkaSpeciesImportStatusCache.set(speciesId, status);
    });
  }

  return statuses;
}

/** Fetch imported status for Pinkka groups in batch. */
export async function getPinkkaGroupImportStatusMap(
  groupIds: number[],
): Promise<Record<number, boolean>> {
  const statusMap = await getPinkkaGroupImportStateMap(groupIds);
  return Object.fromEntries(
    groupIds.map((groupId) => [
      groupId,
      statusMap[groupId]?.isImported === true,
    ]),
  );
}

/** Fetch imported status for Pinkka stacks in a group, in batch. */
export async function getPinkkaStackImportStatusMap(
  groupId: number,
  stackIds: number[],
): Promise<Record<number, boolean>> {
  const statusMap = await getPinkkaStackImportStateMap(groupId, stackIds);
  return Object.fromEntries(
    stackIds.map((stackId) => [
      stackId,
      statusMap[stackId]?.isImported === true,
    ]),
  );
}

/** Fetch imported status for Pinkka species in a stack, in batch. */
export async function getPinkkaSpeciesImportStatusMap(
  groupId: number,
  stackId: number,
  speciesIds: number[],
): Promise<Record<number, boolean>> {
  const statusMap = await getPinkkaSpeciesImportStateMap(
    groupId,
    stackId,
    speciesIds,
  );
  return Object.fromEntries(
    speciesIds.map((speciesId) => [
      speciesId,
      statusMap[speciesId]?.isImported === true,
    ]),
  );
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

function getPreferredPinkkaImageUrl(image: PinkkaImageAsset): string | null {
  const urls = image.urls;
  if (!urls) {
    return null;
  }

  return (
    urls.original ??
    urls.full ??
    urls.large ??
    urls.square ??
    urls.thumbnail ??
    null
  );
}

function isPinkkaImageAsset(value: unknown): value is PinkkaImageAsset {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { id?: unknown; urls?: unknown };
  return typeof candidate.id === "string" || typeof candidate.urls === "object";
}

function getPinkkaImageAssetsFromUnknown(value: unknown): PinkkaImageAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isPinkkaImageAsset);
}

function getPinkkaGroupImageAssets(group: PinkkaGroup): PinkkaImageAsset[] {
  const candidate = group as unknown as {
    image?: unknown;
    images?: unknown;
  };
  const imageAssets = getPinkkaImageAssetsFromUnknown(candidate.images);
  if (imageAssets.length > 0) {
    return imageAssets;
  }
  return isPinkkaImageAsset(candidate.image) ? [candidate.image] : [];
}

function getPinkkaStackImageAssets(stack: PinkkaSubStack): PinkkaImageAsset[] {
  const candidate = stack as unknown as {
    image?: unknown;
    images?: unknown;
  };
  const imageAssets = getPinkkaImageAssetsFromUnknown(candidate.images);
  if (imageAssets.length > 0) {
    return imageAssets;
  }
  return isPinkkaImageAsset(candidate.image) ? [candidate.image] : [];
}

function getImageFilenameFromUrl(imageUrl: string): string | null {
  try {
    const pathname = new URL(imageUrl).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const candidate = segments[segments.length - 1];
    if (!candidate) {
      return null;
    }
    return decodeURIComponent(candidate);
  } catch {
    return null;
  }
}

async function uploadPinkkaImageFromSource(params: {
  pinkkaImageId: string;
  filename: string;
  sourceUrl: string;
  progressContext?: PinkkaImportProgressContext;
  progressLevel?: "stacks" | "species";
  forceDownload?: boolean;
}): Promise<string | null> {
  const {
    pinkkaImageId,
    filename,
    sourceUrl,
    progressContext,
    progressLevel,
    forceDownload,
  } = params;
  assertPinkkaImportNotInterrupted(progressContext);
  const cached = forceDownload
    ? undefined
    : pinkkaImportedImageUrlCache.get(sourceUrl);
  if (cached !== undefined) {
    if (progressContext && progressLevel) {
      progressContext.progress[progressLevel].imageDownloadsCompleted += 1;
      emitPinkkaImportProgress(progressContext);
    }
    return cached;
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const imageIdPathPart = pinkkaImageId.replaceAll("/", "_");
    const filenamePathPart = filename.replaceAll("/", "_");
    const imageRef = ref(
      storage,
      `pinkka/${imageIdPathPart}/${filenamePathPart}`,
    );
    await uploadBytes(imageRef, blob, {
      contentType: blob.type || "image/jpeg",
    });
    const downloadUrl = await getDownloadURL(imageRef);
    pinkkaImportedImageUrlCache.set(sourceUrl, downloadUrl);
    if (progressContext && progressLevel) {
      progressContext.progress[progressLevel].imageDownloadsCompleted += 1;
      emitPinkkaImportProgress(progressContext);
    }
    return downloadUrl;
  } catch (error) {
    console.error(
      `Failed to store Pinkka image ${pinkkaImageId}/${filename}`,
      error,
    );
    return null;
  }
}

async function storePinkkaSpeciesImages(
  speciesId: number,
  detail: PinkkaSpeciesDetail,
  progressContext?: PinkkaImportProgressContext,
  forceDownload = false,
): Promise<void> {
  const images = detail.images ?? [];
  for (let index = 0; index < images.length; index += 1) {
    assertPinkkaImportNotInterrupted(progressContext);
    const image = images[index] as PinkkaImageAsset;
    const sourceUrl = getPreferredPinkkaImageUrl(image);
    if (!sourceUrl) {
      continue;
    }

    const pinkkaImageId = image.id || `species-${speciesId}-${index + 1}`;
    const filename =
      getImageFilenameFromUrl(sourceUrl) ?? `${pinkkaImageId}.jpg`;
    await uploadPinkkaImageFromSource({
      pinkkaImageId,
      filename,
      sourceUrl,
      progressContext,
      progressLevel: "species",
      forceDownload,
    });
  }
}

async function storePinkkaStackImage(
  stackId: number,
  stack: PinkkaSubStack,
  progressContext?: PinkkaImportProgressContext,
  forceDownload = false,
): Promise<void> {
  assertPinkkaImportNotInterrupted(progressContext);
  const stackImage = stack.image;
  if (!stackImage) {
    return;
  }

  const sourceUrl = getPreferredPinkkaImageUrl(stackImage);
  if (!sourceUrl) {
    return;
  }

  const pinkkaImageId = stackImage.id || stack.imageId || `stack-${stackId}`;
  const filename = getImageFilenameFromUrl(sourceUrl) ?? `${pinkkaImageId}.jpg`;
  await uploadPinkkaImageFromSource({
    pinkkaImageId,
    filename,
    sourceUrl,
    progressContext,
    progressLevel: "stacks",
    forceDownload,
  });
}

async function getStoredPinkkaImageDownloadUrl(params: {
  pinkkaImageId: string;
  filename: string;
}): Promise<string | null> {
  const imageIdPathPart = params.pinkkaImageId.replaceAll("/", "_");
  const filenamePathPart = params.filename.replaceAll("/", "_");
  const imageRef = ref(
    storage,
    `pinkka/${imageIdPathPart}/${filenamePathPart}`,
  );
  try {
    return await getDownloadURL(imageRef);
  } catch {
    return null;
  }
}

async function mapPinkkaImageAssetsToEntityImages(params: {
  assets: PinkkaImageAsset[];
  fallbackIdPrefix: string;
  resolveStoredUrls?: boolean;
}): Promise<EntityImage[]> {
  const resolveStoredUrls = params.resolveStoredUrls ?? true;
  const mappedImages: EntityImage[] = [];
  for (let index = 0; index < params.assets.length; index += 1) {
    const asset = params.assets[index];
    const sourceUrl = getPreferredPinkkaImageUrl(asset);
    if (!sourceUrl) {
      continue;
    }

    const pinkkaImageId = asset.id || `${params.fallbackIdPrefix}-${index + 1}`;
    const filename =
      getImageFilenameFromUrl(sourceUrl) ?? `${pinkkaImageId}.jpg`;

    let storedUrl: string | null = sourceUrl;

    if (resolveStoredUrls) {
      storedUrl = await getStoredPinkkaImageDownloadUrl({
        pinkkaImageId,
        filename,
      });
    }

    if (resolveStoredUrls && !storedUrl) {
      storedUrl = await uploadPinkkaImageFromSource({
        pinkkaImageId,
        filename,
        sourceUrl,
      });
    }

    if (!storedUrl) {
      continue;
    }

    mappedImages.push({
      id: pinkkaImageId,
      urls: {
        original: storedUrl,
        full: storedUrl,
        large: storedUrl,
        square: storedUrl,
        thumbnail: storedUrl,
      },
    });
  }

  return mappedImages;
}

function assertInterrupted(shouldInterrupt?: () => boolean): void {
  if (shouldInterrupt?.() === true) {
    throw new Error(PINKKA_IMPORT_INTERRUPTED_ERROR_MESSAGE);
  }
}

async function getImportedPinkkaGroupEntity(
  groupId: number,
): Promise<PinkkaGroup | null> {
  return fetchPinkkaGroupWithStacks(groupId);
}

async function getImportedPinkkaStackEntity(params: {
  groupId: number;
  stackId: number;
}): Promise<PinkkaSubStack | null> {
  void params.groupId;
  return fetchPinkkaSubStack(params.stackId);
}

function mergeImportedAndGroupStacks(params: {
  sourceGroup: ImportedPinkkaGroupEntry;
  importedStacks: ImportedPinkkaStackEntry[];
}): PinkkaSubStack[] {
  const importedStackById = new Map<number, PinkkaSubStack>(
    params.importedStacks.map((entry) => [entry.stackId, entry.entity]),
  );
  const groupStackById = new Map<number, PinkkaSubStack>(
    (params.sourceGroup.entity.subPinkkas ?? []).map((stack) => [
      stack.id,
      stack,
    ]),
  );
  const mergedStackIds = new Set<number>([
    ...groupStackById.keys(),
    ...importedStackById.keys(),
  ]);
  return [...mergedStackIds]
    .map(
      (stackId) =>
        importedStackById.get(stackId) ?? groupStackById.get(stackId),
    )
    .filter((stack): stack is PinkkaSubStack => stack !== undefined)
    .sort((left, right) => (left.orderNo ?? 0) - (right.orderNo ?? 0));
}

function getTaxonomyEntryByRank(
  detail: PinkkaSpeciesDetail,
  rank: "MX.genus" | "MX.family",
): NonNullable<PinkkaSpeciesDetail["taxonomy"]>[number] | undefined {
  return detail.taxonomy?.find((entry) => entry.rank === rank);
}

function mapPinkkaTaxonomyChain(
  detail: PinkkaSpeciesDetail,
): NonNullable<Species["data"]["taxonomy"]> | undefined {
  const mapped: NonNullable<Species["data"]["taxonomy"]> = [];
  for (const entry of detail.taxonomy ?? []) {
    const taxonId = entry.taxonId?.trim();
    const scientificName = entry.scientificName?.trim();
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

/** Convert Pinkka species detail payload to app species data with resolved image URLs. */
export async function mapPinkkaSpeciesDetailToContentData(
  detail: PinkkaSpeciesDetail,
  options?: { includeImages?: boolean; resolveStoredImageUrls?: boolean },
): Promise<Species["data"]> {
  const includeImages = options?.includeImages ?? true;
  const resolveStoredImageUrls = options?.resolveStoredImageUrls ?? true;
  const genusTaxonomyEntry = getTaxonomyEntryByRank(detail, "MX.genus");
  const familyTaxonomyEntry = getTaxonomyEntryByRank(detail, "MX.family");
  const genusScientificName = genusTaxonomyEntry?.scientificName?.trim();
  const familyScientificName = familyTaxonomyEntry?.scientificName?.trim();
  const genusVernacularName = genusTaxonomyEntry?.vernacularName ?? undefined;
  const familyVernacularName = familyTaxonomyEntry?.vernacularName ?? undefined;
  const taxonomy = mapPinkkaTaxonomyChain(detail);
  if (!includeImages) {
    return {
      taxonId: detail.taxonId,
      scientificName: detail.scientificName,
      ...(genusScientificName ? { genusScientificName } : {}),
      ...(genusVernacularName ? { genusVernacularName } : {}),
      ...(familyScientificName ? { familyScientificName } : {}),
      ...(familyVernacularName ? { familyVernacularName } : {}),
      ...(taxonomy ? { taxonomy } : {}),
      ...(detail.vernacularName
        ? { vernacularName: detail.vernacularName }
        : {}),
      ...(detail.description ? { description: detail.description } : {}),
      images: [],
    };
  }

  const mappedImages: SpeciesImage[] = [];
  const sourceImages = detail.images ?? [];

  for (let index = 0; index < sourceImages.length; index += 1) {
    const sourceImage = sourceImages[index];
    const sourceUrl = getPreferredPinkkaImageUrl(sourceImage);
    let finalUrl = sourceUrl ?? null;

    if (sourceUrl && resolveStoredImageUrls) {
      const pinkkaImageId =
        sourceImage.id ||
        `${detail.taxonId || detail.scientificName}-${index + 1}`;
      const filename = getImageFilenameFromUrl(sourceUrl);
      if (filename) {
        const storedUrl = await getStoredPinkkaImageDownloadUrl({
          pinkkaImageId,
          filename,
        });
        finalUrl = storedUrl ?? sourceUrl;
      }
    }

    if (!finalUrl) {
      continue;
    }

    const mappedImage: SpeciesImage = {
      id:
        sourceImage.id ||
        `${detail.taxonId || detail.scientificName}-${index + 1}`,
      urls: {
        original: finalUrl,
        full: finalUrl,
        large: finalUrl,
        square: finalUrl,
        thumbnail: finalUrl,
      },
      ...(sourceImage.caption ? { caption: sourceImage.caption } : {}),
      ...(sourceImage.taxonId ? { taxonId: sourceImage.taxonId } : {}),
      ...(sourceImage.meta ? { meta: sourceImage.meta } : {}),
    };

    mappedImages.push(mappedImage);
  }

  return {
    taxonId: detail.taxonId,
    scientificName: detail.scientificName,
    ...(genusScientificName ? { genusScientificName } : {}),
    ...(genusVernacularName ? { genusVernacularName } : {}),
    ...(familyScientificName ? { familyScientificName } : {}),
    ...(familyVernacularName ? { familyVernacularName } : {}),
    ...(taxonomy ? { taxonomy } : {}),
    ...(detail.vernacularName ? { vernacularName: detail.vernacularName } : {}),
    ...(detail.description ? { description: detail.description } : {}),
    images: mappedImages,
  };
}

/**
 * Create editable app content (group, stacks, species) from one imported
 * Pinkka group using large Firestore write batches.
 */
export async function createEditableGroupFromImportedPinkka(params: {
  sourceGroup: ImportedPinkkaGroupEntry;
  ownerId: string;
  order: number;
  includeImages?: boolean;
  progressContext?: PinkkaImportProgressContext;
  shouldInterrupt?: () => boolean;
}): Promise<CreateGroupFromPinkkaImportResult> {
  const includeImages = params.includeImages ?? false;
  const resolvedSourceGroupEntity =
    (await fetchPinkkaGroupWithStacks(params.sourceGroup.groupId)) ??
    params.sourceGroup.entity;
  const resolvedSourceGroup: ImportedPinkkaGroupEntry = {
    ...params.sourceGroup,
    entity: resolvedSourceGroupEntity,
    stackCount: resolvedSourceGroupEntity.subPinkkas?.length ?? 0,
  };
  const groupId = buildCanonicalId();
  const now = Timestamp.now();
  // Imported Pinkka entities already carry usable remote image URLs, so reuse
  // them here instead of re-querying Firebase Storage for every asset during
  // editable-group creation.
  const groupImages = await mapPinkkaImageAssetsToEntityImages({
    assets: getPinkkaGroupImageAssets(resolvedSourceGroup.entity),
    fallbackIdPrefix: `group-${resolvedSourceGroup.groupId}`,
    resolveStoredUrls: false,
  });
  const groupSourceData: GroupData = {
    name: resolvedSourceGroup.entity.name,
    ...(resolvedSourceGroup.entity.description
      ? { description: resolvedSourceGroup.entity.description }
      : {}),
  };
  const groupSourceRecords = [
    buildPinkkaSourceRecord<GroupData>({
      entityType: "group",
      externalId: resolvedSourceGroup.groupId,
      data: groupSourceData,
    }),
  ];

  const operations: BatchSetOperation[] = [];
  operations.push({
    ref: doc(db, "groups", groupId),
    data: {
      data: groupSourceData,
      sourceRecords: groupSourceRecords,
      sourceKeys: getContentSourceKeys(groupSourceRecords),
      pinkkaRef: {
        groupId: resolvedSourceGroup.groupId,
      },
      images: groupImages,
      ownerId: params.ownerId,
      order: params.order,
      isHidden: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  const sourceStacks = [...(resolvedSourceGroup.entity.subPinkkas ?? [])].sort(
    (left, right) => (left.orderNo ?? 0) - (right.orderNo ?? 0),
  );

  await commitSetOperationsInBatches(
    operations,
    getPinkkaImportBatchCommitOptions(operations.length),
  );

  let createdSpeciesCount = 0;
  for (let stackIndex = 0; stackIndex < sourceStacks.length; stackIndex += 1) {
    assertInterrupted(params.shouldInterrupt);
    const sourceStack = sourceStacks[stackIndex];
    const stackName = getPinkkaStackDisplayName(sourceStack);
    updateCurrentEntityProgress(params.progressContext, "stacks", stackName);
    const stackId = buildCanonicalId();
    const stackImages = await mapPinkkaImageAssetsToEntityImages({
      assets: getPinkkaStackImageAssets(sourceStack),
      fallbackIdPrefix: sourceStack.imageId || `stack-${sourceStack.id}`,
      resolveStoredUrls: false,
    });
    const stackSourceData: StackData = {
      name: sourceStack.name,
      ...(sourceStack.description
        ? { description: sourceStack.description }
        : {}),
      images: stackImages,
    };
    const stackSourceRecords = [
      buildPinkkaSourceRecord<StackData>({
        entityType: "stack",
        externalId: sourceStack.id,
        data: stackSourceData,
        metadata: {
          groupId: resolvedSourceGroup.groupId,
        },
      }),
    ];
    const stackSpeciesIds: string[] = [];
    const pinkkaSpeciesIdsForStatus: number[] = [];

    const importedSpecies = await getImportedPinkkaSpeciesEntries(
      resolvedSourceGroup.groupId,
      sourceStack.id,
    );
    const importedSpeciesIdSet = new Set(
      importedSpecies.map((entry) => entry.speciesId),
    );
    const sourceSpeciesCards = (sourceStack.speciesCards ?? []).filter(
      (card) => !importedSpeciesIdSet.has(card.id),
    );
    extendPinkkaImportProgressTotals(params.progressContext, {
      species: importedSpecies.length + sourceSpeciesCards.length,
    });
    const canonicalLearningItemsByPinkkaSpeciesId = new Map<
      number,
      Species | null
    >(
      [
        ...(
          await getCanonicalLearningItemsByPinkkaSpeciesIds([
            ...importedSpecies.map((entry) => entry.speciesId),
            ...(sourceStack.speciesCards ?? [])
              .map((card) => card.id)
              .filter((speciesId) =>
                importedSpecies.every((entry) => entry.speciesId !== speciesId),
              ),
          ])
        ).entries(),
      ].map(([pinkkaSpeciesId, species]) => [pinkkaSpeciesId, species ?? null]),
    );
    const stackOperations: BatchSetOperation[] = [];
    for (const importedSpeciesEntry of importedSpecies) {
      assertInterrupted(params.shouldInterrupt);
      updateCurrentEntityProgress(
        params.progressContext,
        "species",
        getPinkkaSpeciesDisplayName(
          importedSpeciesEntry.speciesId,
          importedSpeciesEntry.entity,
        ),
        importedSpeciesEntry.entity.images?.length ?? 0,
      );
      const mappedData = await mapPinkkaSpeciesDetailToContentData(
        importedSpeciesEntry.entity,
        {
          includeImages,
          resolveStoredImageUrls: false,
        },
      );
      const sourceRecord = buildPinkkaSourceRecord<SpeciesData>({
        entityType: "species",
        externalId: importedSpeciesEntry.speciesId,
        data: mappedData,
      });
      const existingSpecies = canonicalLearningItemsByPinkkaSpeciesId.has(
        importedSpeciesEntry.speciesId,
      )
        ? (canonicalLearningItemsByPinkkaSpeciesId.get(
            importedSpeciesEntry.speciesId,
          ) ?? null)
        : null;
      canonicalLearningItemsByPinkkaSpeciesId.set(
        importedSpeciesEntry.speciesId,
        existingSpecies,
      );
      const upsertResult = await buildCanonicalLearningItemUpsertOperation({
        existingSpecies,
        ownerId: params.ownerId,
        sourceRecord,
        pinkkaRef: {
          speciesId: importedSpeciesEntry.speciesId,
        },
        isHidden: existingSpecies?.isHidden ?? false,
        testImageIds: existingSpecies?.testImageIds,
        now,
      });
      if (upsertResult.operation) {
        stackOperations.push(upsertResult.operation);
      }
      canonicalLearningItemsByPinkkaSpeciesId.set(
        importedSpeciesEntry.speciesId,
        existingSpecies ??
          ({
            id: upsertResult.speciesId,
            ...upsertResult.operation?.data,
            createdAt: now.toDate(),
            updatedAt: now.toDate(),
          } as Species),
      );
      stackSpeciesIds.push(upsertResult.speciesId);
      pinkkaSpeciesIdsForStatus.push(importedSpeciesEntry.speciesId);
      if (upsertResult.created) {
        createdSpeciesCount += 1;
      }
      if (params.progressContext) {
        params.progressContext.progress.species.completed += 1;
        emitPinkkaImportProgress(params.progressContext);
      }
    }
    for (const sourceSpeciesCard of sourceSpeciesCards) {
      assertInterrupted(params.shouldInterrupt);
      const speciesData: SpeciesData = {
        taxonId: sourceSpeciesCard.taxonId ?? "",
        scientificName: sourceSpeciesCard.scientificName ?? "",
        ...(sourceSpeciesCard.vernacularName
          ? { vernacularName: sourceSpeciesCard.vernacularName }
          : {}),
        images: [],
      };
      updateCurrentEntityProgress(
        params.progressContext,
        "species",
        speciesData.scientificName || `Species ${sourceSpeciesCard.id}`,
      );
      const sourceRecord = buildPinkkaSourceRecord<SpeciesData>({
        entityType: "species",
        externalId: sourceSpeciesCard.id,
        data: speciesData,
      });
      const existingSpecies = canonicalLearningItemsByPinkkaSpeciesId.has(
        sourceSpeciesCard.id,
      )
        ? (canonicalLearningItemsByPinkkaSpeciesId.get(sourceSpeciesCard.id) ??
          null)
        : null;
      canonicalLearningItemsByPinkkaSpeciesId.set(
        sourceSpeciesCard.id,
        existingSpecies,
      );
      const upsertResult = await buildCanonicalLearningItemUpsertOperation({
        existingSpecies,
        ownerId: params.ownerId,
        sourceRecord,
        pinkkaRef: {
          speciesId: sourceSpeciesCard.id,
        },
        isHidden: existingSpecies?.isHidden ?? false,
        testImageIds: existingSpecies?.testImageIds,
        now,
      });
      if (upsertResult.operation) {
        stackOperations.push(upsertResult.operation);
      }
      canonicalLearningItemsByPinkkaSpeciesId.set(
        sourceSpeciesCard.id,
        existingSpecies ??
          ({
            id: upsertResult.speciesId,
            ...upsertResult.operation?.data,
            createdAt: now.toDate(),
            updatedAt: now.toDate(),
          } as Species),
      );
      stackSpeciesIds.push(upsertResult.speciesId);
      pinkkaSpeciesIdsForStatus.push(sourceSpeciesCard.id);
      if (upsertResult.created) {
        createdSpeciesCount += 1;
      }
      if (params.progressContext) {
        params.progressContext.progress.species.completed += 1;
        emitPinkkaImportProgress(params.progressContext);
      }
    }

    stackOperations.unshift({
      ref: doc(db, "groups", groupId, "stacks", stackId),
      data: {
        stackId,
        parentGroupId: groupId,
        data: stackSourceData,
        sourceRecords: stackSourceRecords,
        sourceKeys: getContentSourceKeys(stackSourceRecords),
        pinkkaRef: {
          groupId: resolvedSourceGroup.groupId,
          stackId: sourceStack.id,
        },
        images: stackImages,
        learningItemIds: stackSpeciesIds,
        speciesIds: stackSpeciesIds,
        ownerId: params.ownerId,
        order: stackIndex,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      },
    });
    await commitSetOperationsInBatches(
      stackOperations,
      getPinkkaImportBatchCommitOptions(stackOperations.length),
    );
    await markPinkkaStackAndSpeciesImportCompleted({
      groupId: resolvedSourceGroup.groupId,
      stackId: sourceStack.id,
      speciesIds: pinkkaSpeciesIdsForStatus,
    });
    markStackCompleted(
      params.progressContext,
      resolvedSourceGroup.groupId,
      sourceStack.id,
      stackName,
    );
    await waitForPinkkaImportCommitDrain(stackOperations.length);
  }

  return {
    groupId,
    createdStackCount: sourceStacks.length,
    createdSpeciesCount,
  };
}

type EditableStackRefreshOperationsResult = {
  stackId: string;
  pinkkaStackId: number;
  pinkkaSpeciesIds: number[];
  createdStack: boolean;
  updatedStack: boolean;
  createdSpeciesCount: number;
  updatedSpeciesCount: number;
  deletedSpeciesCount: number;
  operations: BatchSetOperation[];
  deleteRefs: DocumentReference[];
};

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

function normalizeSyncComparableValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSyncComparableValue(entry));
  }
  if (typeof value === "object" && value !== null) {
    const normalized: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    for (const [key, entry] of entries) {
      normalized[key] = normalizeSyncComparableValue(entry);
    }
    return normalized;
  }
  return value;
}

function areSyncComparableValuesEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeSyncComparableValue(left)) ===
    JSON.stringify(normalizeSyncComparableValue(right))
  );
}

async function buildEditableStackRefreshOperations(params: {
  groupId: string;
  ownerId: string;
  pinkkaGroupId: number;
  sourceStack: PinkkaSubStack;
  importedSpecies: ImportedPinkkaSpeciesEntry[];
  order: number;
  existingStack?: {
    id: string;
    data: DocumentData;
  };
  includeSpeciesImages: boolean;
  progressContext?: PinkkaImportProgressContext;
  shouldInterrupt?: () => boolean;
}): Promise<EditableStackRefreshOperationsResult> {
  assertInterrupted(params.shouldInterrupt);
  const now = Timestamp.now();
  const stackId = params.existingStack?.id ?? buildCanonicalId();
  const stackData = params.existingStack?.data ?? {};
  const stackName = getPinkkaStackDisplayName(params.sourceStack);
  updateCurrentEntityProgress(params.progressContext, "stacks", stackName);
  const stackImages = await mapPinkkaImageAssetsToEntityImages({
    assets: getPinkkaStackImageAssets(params.sourceStack),
    fallbackIdPrefix:
      params.sourceStack.imageId || `stack-${params.sourceStack.id}`,
    resolveStoredUrls: false,
  });
  const stackSourceData: StackData = {
    name: params.sourceStack.name,
    ...(params.sourceStack.description
      ? { description: params.sourceStack.description }
      : {}),
    images: stackImages,
  };
  const stackSourceRecords = upsertContentSourceRecord(
    stackData.sourceRecords as ContentSourceRecord<StackData>[] | undefined,
    buildPinkkaSourceRecord<StackData>({
      entityType: "stack",
      externalId: params.sourceStack.id,
      data: stackSourceData,
      metadata: {
        groupId: params.pinkkaGroupId,
      },
    }),
  );
  const stackManualOverrides = getEntityManualOverrides(
    stackData as Partial<SourceBackedEntity<StackData>>,
    stackSourceData,
  );
  const mergedStackData = mergeSourceContentData(
    stackSourceData,
    stackManualOverrides,
  );
  const stackOwnerId = stackData.ownerId ?? params.ownerId;
  const stackIsHidden = stackData.isHidden ?? false;
  const existingStackOrder =
    typeof stackData.order === "number" ? stackData.order : 0;
  const stackSpeciesIds: string[] = [];
  const stackDocumentData = {
    stackId,
    parentGroupId: params.groupId,
    data: mergedStackData,
    sourceRecords: stackSourceRecords,
    ...(getContentSourceKeys(stackSourceRecords)
      ? { sourceKeys: getContentSourceKeys(stackSourceRecords) }
      : {}),
    ...(stackManualOverrides ? { manualOverrides: stackManualOverrides } : {}),
    pinkkaRef: {
      groupId: params.pinkkaGroupId,
      stackId: params.sourceStack.id,
    },
    images: stackImages,
    learningItemIds: stackSpeciesIds,
    speciesIds: stackSpeciesIds,
    ownerId: stackOwnerId,
    order: params.order,
    isHidden: stackIsHidden,
    createdAt: stackData.createdAt ?? now,
    updatedAt: now,
  };
  const stackCoreDataChanged =
    params.existingStack === undefined ||
    !areSyncComparableValuesEqual(
      {
        stackId,
        parentGroupId: params.groupId,
        data: stackData.data,
        sourceRecords: stackData.sourceRecords,
        sourceKeys: stackData.sourceKeys,
        manualOverrides: stackData.manualOverrides,
        pinkkaRef: stackData.pinkkaRef,
        images: stackData.images,
        learningItemIds: getStackLinkedLearningItemIdsFromData(stackData),
        ownerId: stackOwnerId,
        order: existingStackOrder,
        isHidden: stackIsHidden,
      },
      {
        stackId,
        parentGroupId: params.groupId,
        data: stackDocumentData.data,
        sourceRecords: stackDocumentData.sourceRecords,
        sourceKeys: stackDocumentData.sourceKeys,
        manualOverrides: stackDocumentData.manualOverrides,
        pinkkaRef: stackDocumentData.pinkkaRef,
        images: stackDocumentData.images,
        learningItemIds: stackDocumentData.learningItemIds,
        ownerId: stackDocumentData.ownerId,
        order: stackDocumentData.order,
        isHidden: stackDocumentData.isHidden,
      },
    );

  const operations: BatchSetOperation[] = [];
  const deleteRefs: DocumentReference[] = [];
  const speciesSnapshot = await getDocs(
    collection(db, "groups", params.groupId, "stacks", stackId, "species"),
  );
  const legacySpeciesDocsById = new Map(
    speciesSnapshot.docs.map((speciesDoc) => [speciesDoc.id, speciesDoc]),
  );
  const speciesIdsToResolve = dedupeIds([
    ...getStackLinkedLearningItemIdsFromData(stackData),
    ...speciesSnapshot.docs.map((speciesDoc) => speciesDoc.id),
  ]);
  const existingLinkedSpecies = await Promise.all(
    speciesIdsToResolve.map((speciesId) =>
      ensureCanonicalLearningItemDocument(speciesId),
    ),
  );
  const existingLinkedSpeciesByPinkkaId = new Map<number, Species>();
  for (const species of existingLinkedSpecies) {
    if (!species) {
      continue;
    }
    const pinkkaSpeciesId = species.pinkkaRef?.speciesId;
    if (typeof pinkkaSpeciesId !== "number") {
      continue;
    }
    existingLinkedSpeciesByPinkkaId.set(pinkkaSpeciesId, species);
  }

  const seenPinkkaSpeciesIds = new Set<number>();
  let createdSpeciesCount = 0;
  let updatedSpeciesCount = 0;
  const sourceSpeciesCards = params.sourceStack.speciesCards ?? [];
  const importedSpeciesIds = new Set(
    params.importedSpecies.map((item) => item.speciesId),
  );
  const fallbackSpeciesCards = sourceSpeciesCards.filter(
    (card) => !importedSpeciesIds.has(card.id),
  );
  const sourceSpeciesEntries: Array<
    | {
        speciesId: number;
        detail: PinkkaSpeciesDetail;
      }
    | {
        speciesId: number;
        card: PinkkaSpeciesCard;
      }
  > = [
    ...params.importedSpecies.map((item) => ({
      speciesId: item.speciesId,
      detail: item.entity,
    })),
    ...fallbackSpeciesCards.map((card) => ({ speciesId: card.id, card })),
  ];
  const preloadedCanonicalLearningItemsByPinkkaSpeciesId =
    await getCanonicalLearningItemsByPinkkaSpeciesIds(
      sourceSpeciesEntries.map((entry) => entry.speciesId),
    );

  for (
    let speciesIndex = 0;
    speciesIndex < sourceSpeciesEntries.length;
    speciesIndex += 1
  ) {
    assertInterrupted(params.shouldInterrupt);
    const sourceSpecies = sourceSpeciesEntries[speciesIndex];
    updateCurrentEntityProgress(
      params.progressContext,
      "species",
      "detail" in sourceSpecies
        ? getPinkkaSpeciesDisplayName(
            sourceSpecies.speciesId,
            sourceSpecies.detail,
          )
        : sourceSpecies.card.scientificName ||
            `Species ${sourceSpecies.speciesId}`,
      "detail" in sourceSpecies
        ? (sourceSpecies.detail.images?.length ?? 0)
        : 0,
    );
    const existingSpecies =
      existingLinkedSpeciesByPinkkaId.get(sourceSpecies.speciesId) ??
      preloadedCanonicalLearningItemsByPinkkaSpeciesId.get(
        sourceSpecies.speciesId,
      ) ??
      null;
    const existingSpeciesData = (existingSpecies?.data ??
      {}) as Partial<SpeciesData>;
    const sourceData =
      "detail" in sourceSpecies
        ? await mapPinkkaSpeciesDetailToContentData(sourceSpecies.detail, {
            includeImages: params.includeSpeciesImages,
            resolveStoredImageUrls: false,
          })
        : {
            taxonId:
              sourceSpecies.card.taxonId ?? existingSpeciesData.taxonId ?? "",
            scientificName:
              sourceSpecies.card.scientificName ??
              existingSpeciesData.scientificName ??
              "",
            ...(sourceSpecies.card.vernacularName
              ? { vernacularName: sourceSpecies.card.vernacularName }
              : existingSpeciesData.vernacularName
                ? { vernacularName: existingSpeciesData.vernacularName }
                : {}),
            ...(existingSpeciesData.genusScientificName
              ? {
                  genusScientificName: existingSpeciesData.genusScientificName,
                }
              : {}),
            ...(existingSpeciesData.genusVernacularName
              ? {
                  genusVernacularName: existingSpeciesData.genusVernacularName,
                }
              : {}),
            ...(existingSpeciesData.familyScientificName
              ? {
                  familyScientificName:
                    existingSpeciesData.familyScientificName,
                }
              : {}),
            ...(existingSpeciesData.familyVernacularName
              ? {
                  familyVernacularName:
                    existingSpeciesData.familyVernacularName,
                }
              : {}),
            ...(existingSpeciesData.taxonomy
              ? { taxonomy: existingSpeciesData.taxonomy }
              : {}),
            ...(existingSpeciesData.description
              ? { description: existingSpeciesData.description }
              : {}),
            images: existingSpeciesData.images ?? [],
          };
    const imageIds = new Set(
      (sourceData.images ?? []).map((image: SpeciesImage) => image.id),
    );
    const existingTestImageIds = (existingSpecies?.testImageIds ?? []).filter(
      (id) => imageIds.has(id),
    );
    const sourceRecord = buildPinkkaSourceRecord<SpeciesData>({
      entityType: "species",
      externalId: sourceSpecies.speciesId,
      data: sourceData,
    });
    const upsertResult = await buildCanonicalLearningItemUpsertOperation({
      existingSpecies,
      ownerId: existingSpecies?.ownerId ?? stackOwnerId,
      sourceRecord,
      pinkkaRef: {
        speciesId: sourceSpecies.speciesId,
      },
      testImageIds: existingTestImageIds,
      isHidden: existingSpecies?.isHidden ?? false,
      now,
    });
    if (upsertResult.operation) {
      operations.push(upsertResult.operation);
      if (upsertResult.created) {
        createdSpeciesCount += 1;
      } else {
        updatedSpeciesCount += 1;
      }
    }
    stackSpeciesIds.push(upsertResult.speciesId);

    seenPinkkaSpeciesIds.add(sourceSpecies.speciesId);
    if (params.progressContext) {
      params.progressContext.progress.species.completed += 1;
      emitPinkkaImportProgress(params.progressContext);
    }
  }

  let deletedSpeciesCount = 0;
  for (const [pinkkaSpeciesId] of existingLinkedSpeciesByPinkkaId) {
    if (seenPinkkaSpeciesIds.has(pinkkaSpeciesId)) {
      continue;
    }
    deletedSpeciesCount += 1;
  }
  for (const legacySpeciesDoc of legacySpeciesDocsById.values()) {
    deleteRefs.push(legacySpeciesDoc.ref);
  }

  const hasSpeciesChanges =
    createdSpeciesCount > 0 ||
    updatedSpeciesCount > 0 ||
    deletedSpeciesCount > 0;
  const shouldWriteStack =
    params.existingStack === undefined ||
    stackCoreDataChanged ||
    hasSpeciesChanges;
  if (shouldWriteStack) {
    operations.unshift({
      ref: doc(db, "groups", params.groupId, "stacks", stackId),
      data: stackDocumentData,
    });
  }

  return {
    stackId,
    pinkkaStackId: params.sourceStack.id,
    pinkkaSpeciesIds: [...seenPinkkaSpeciesIds],
    createdStack: params.existingStack === undefined,
    updatedStack: params.existingStack !== undefined && shouldWriteStack,
    createdSpeciesCount,
    updatedSpeciesCount,
    deletedSpeciesCount,
    operations,
    deleteRefs,
  };
}

/** Refresh one editable group and linked descendants from Pinkka. */
export async function refreshEditableGroupFromPinkka(params: {
  groupId: string;
  ownerId: string;
  onProgress?: PinkkaImportProgressCallback;
  progressContext?: PinkkaImportProgressContext;
  shouldInterrupt?: () => boolean;
  includeSpeciesImages?: boolean;
  syncPinkkaStatusMarkers?: boolean;
}): Promise<RefreshGroupFromPinkkaResult> {
  const includeSpeciesImages = params.includeSpeciesImages ?? true;
  const syncPinkkaStatusMarkers = params.syncPinkkaStatusMarkers ?? true;
  const groupRef = doc(db, "groups", params.groupId);
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) {
    throw new Error(`Group ${params.groupId} was not found.`);
  }

  const existingGroupData = groupDoc.data();
  const pinkkaGroupId = existingGroupData.pinkkaRef?.groupId;
  if (typeof pinkkaGroupId !== "number") {
    throw new Error(`Group ${params.groupId} is not linked to Pinkka.`);
  }

  const importedGroupEntity = await getImportedPinkkaGroupEntity(pinkkaGroupId);
  if (!importedGroupEntity) {
    throw new Error(`Imported Pinkka group ${pinkkaGroupId} was not found.`);
  }

  const sourceGroup: ImportedPinkkaGroupEntry = {
    groupId: pinkkaGroupId,
    entity: importedGroupEntity,
    stackCount: importedGroupEntity.subPinkkas?.length ?? 0,
    isIncomplete: false,
  };
  updateCurrentEntityProgress(
    params.progressContext,
    "groups",
    getPinkkaGroupDisplayName(importedGroupEntity),
  );
  const importedStacks = await getImportedPinkkaStackEntries(pinkkaGroupId);
  const sourceStacks = mergeImportedAndGroupStacks({
    sourceGroup,
    importedStacks,
  });
  extendPinkkaImportProgressTotals(params.progressContext, {
    stacks: sourceStacks.length,
    species: sourceStacks.reduce(
      (total, sourceStack) => total + (sourceStack.speciesCards?.length ?? 0),
      0,
    ),
  });
  const importedSpeciesMap = await getImportedPinkkaSpeciesEntriesByStack({
    groupId: pinkkaGroupId,
    sourceStacks,
  });
  extendPinkkaImportProgressTotals(params.progressContext, {
    species: sourceStacks.reduce(
      (total, sourceStack) =>
        total +
        Math.max(
          0,
          (importedSpeciesMap.get(sourceStack.id)?.length ?? 0) -
            (sourceStack.speciesCards?.length ?? 0),
        ),
      0,
    ),
  });

  const now = Timestamp.now();
  const groupImages = await mapPinkkaImageAssetsToEntityImages({
    assets: getPinkkaGroupImageAssets(importedGroupEntity),
    fallbackIdPrefix: `group-${pinkkaGroupId}`,
    resolveStoredUrls: false,
  });
  const groupSourceData: GroupData = {
    name: importedGroupEntity.name,
    ...(importedGroupEntity.description
      ? { description: importedGroupEntity.description }
      : {}),
  };
  const groupSourceRecords = upsertContentSourceRecord(
    existingGroupData.sourceRecords as
      | ContentSourceRecord<GroupData>[]
      | undefined,
    buildPinkkaSourceRecord<GroupData>({
      entityType: "group",
      externalId: pinkkaGroupId,
      data: groupSourceData,
    }),
  );
  const groupManualOverrides = getEntityManualOverrides(
    existingGroupData as Partial<SourceBackedEntity<GroupData>>,
    groupSourceData,
  );
  const mergedGroupData = mergeSourceContentData(
    groupSourceData,
    groupManualOverrides,
  );
  const groupOwnerId = existingGroupData.ownerId ?? params.ownerId;
  const existingGroupOrder =
    typeof existingGroupData.order === "number" ? existingGroupData.order : 0;
  const groupIsHidden = existingGroupData.isHidden ?? false;
  const groupDocumentData = {
    data: mergedGroupData,
    sourceRecords: groupSourceRecords,
    ...(getContentSourceKeys(groupSourceRecords)
      ? { sourceKeys: getContentSourceKeys(groupSourceRecords) }
      : {}),
    ...(groupManualOverrides ? { manualOverrides: groupManualOverrides } : {}),
    pinkkaRef: {
      groupId: pinkkaGroupId,
    },
    images: groupImages,
    ownerId: groupOwnerId,
    order: existingGroupOrder,
    isHidden: groupIsHidden,
    createdAt: existingGroupData.createdAt ?? now,
    updatedAt: now,
  };
  const groupCoreDataChanged = !areSyncComparableValuesEqual(
    {
      data: existingGroupData.data,
      sourceRecords: existingGroupData.sourceRecords,
      sourceKeys: existingGroupData.sourceKeys,
      manualOverrides: existingGroupData.manualOverrides,
      pinkkaRef: existingGroupData.pinkkaRef,
      images: existingGroupData.images,
      ownerId: groupOwnerId,
      order: existingGroupOrder,
      isHidden: groupIsHidden,
    },
    {
      data: groupDocumentData.data,
      sourceRecords: groupDocumentData.sourceRecords,
      sourceKeys: groupDocumentData.sourceKeys,
      manualOverrides: groupDocumentData.manualOverrides,
      pinkkaRef: groupDocumentData.pinkkaRef,
      images: groupDocumentData.images,
      ownerId: groupDocumentData.ownerId,
      order: groupDocumentData.order,
      isHidden: groupDocumentData.isHidden,
    },
  );

  const result: RefreshGroupFromPinkkaResult = {
    createdStackCount: 0,
    updatedStackCount: 0,
    deletedStackCount: 0,
    createdSpeciesCount: 0,
    updatedSpeciesCount: 0,
    deletedSpeciesCount: 0,
  };
  const completedPinkkaStacks: Array<{
    stackId: number;
    speciesIds: number[];
  }> = [];

  const existingStacksSnapshot = await getDocs(
    collection(db, "groups", params.groupId, "stacks"),
  );
  const existingLinkedStacksByPinkkaId = new Map<
    number,
    { id: string; data: DocumentData; ref: DocumentReference }
  >();
  for (const stackDoc of existingStacksSnapshot.docs) {
    const pinkkaStackId = stackDoc.data().pinkkaRef?.stackId;
    if (typeof pinkkaStackId !== "number") {
      continue;
    }
    existingLinkedStacksByPinkkaId.set(pinkkaStackId, {
      id: stackDoc.id,
      data: stackDoc.data(),
      ref: stackDoc.ref,
    });
  }

  const seenPinkkaStackIds = new Set<number>();
  for (let stackIndex = 0; stackIndex < sourceStacks.length; stackIndex += 1) {
    assertInterrupted(params.shouldInterrupt);
    const sourceStack = sourceStacks[stackIndex];
    const stackRefreshResult = await buildEditableStackRefreshOperations({
      groupId: params.groupId,
      ownerId: params.ownerId,
      pinkkaGroupId,
      sourceStack,
      importedSpecies: importedSpeciesMap.get(sourceStack.id) ?? [],
      order: stackIndex,
      existingStack: existingLinkedStacksByPinkkaId.get(sourceStack.id),
      includeSpeciesImages,
      progressContext: params.progressContext,
      shouldInterrupt: params.shouldInterrupt,
    });
    seenPinkkaStackIds.add(sourceStack.id);
    await commitSetOperationsInBatches(
      stackRefreshResult.operations,
      getPinkkaImportBatchCommitOptions(stackRefreshResult.operations.length),
    );
    await commitDeleteReferencesInBatches(
      stackRefreshResult.deleteRefs,
      getPinkkaImportBatchCommitOptions(stackRefreshResult.deleteRefs.length),
    );
    if (stackRefreshResult.createdStack) {
      result.createdStackCount += 1;
    }
    if (stackRefreshResult.updatedStack) {
      result.updatedStackCount += 1;
    }
    result.createdSpeciesCount += stackRefreshResult.createdSpeciesCount;
    result.updatedSpeciesCount += stackRefreshResult.updatedSpeciesCount;
    result.deletedSpeciesCount += stackRefreshResult.deletedSpeciesCount;
    completedPinkkaStacks.push({
      stackId: stackRefreshResult.pinkkaStackId,
      speciesIds: stackRefreshResult.pinkkaSpeciesIds,
    });
    markStackCompleted(
      params.progressContext,
      pinkkaGroupId,
      sourceStack.id,
      getPinkkaStackDisplayName(sourceStack),
    );
    await waitForPinkkaImportCommitDrain(stackRefreshResult.operations.length);
  }

  for (const [pinkkaStackId, existingStack] of existingLinkedStacksByPinkkaId) {
    if (seenPinkkaStackIds.has(pinkkaStackId)) {
      continue;
    }
    const speciesSnapshot = await getDocs(
      collection(
        db,
        "groups",
        params.groupId,
        "stacks",
        existingStack.id,
        "species",
      ),
    );
    const stackDeleteRefs = speciesSnapshot.docs.map(
      (speciesDoc) => speciesDoc.ref,
    );
    for (const speciesDoc of speciesSnapshot.docs) {
      result.deletedSpeciesCount += 1;
    }
    stackDeleteRefs.push(existingStack.ref);
    await commitDeleteReferencesInBatches(
      stackDeleteRefs,
      getPinkkaImportBatchCommitOptions(stackDeleteRefs.length),
    );
    result.deletedStackCount += 1;
  }

  const groupHasDescendantChanges =
    result.createdStackCount > 0 ||
    result.updatedStackCount > 0 ||
    result.deletedStackCount > 0 ||
    result.createdSpeciesCount > 0 ||
    result.updatedSpeciesCount > 0 ||
    result.deletedSpeciesCount > 0;
  if (groupCoreDataChanged || groupHasDescendantChanges) {
    await commitSetOperationsInBatches(
      [
        {
          ref: groupRef,
          data: groupDocumentData,
        },
      ],
      getPinkkaImportBatchCommitOptions(1),
    );
  }
  if (syncPinkkaStatusMarkers) {
    for (const completedStack of completedPinkkaStacks) {
      await markPinkkaStackAndSpeciesImportCompleted({
        groupId: pinkkaGroupId,
        stackId: completedStack.stackId,
        speciesIds: completedStack.speciesIds,
      });
    }
    await markPinkkaGroupImportCompletedDirect(pinkkaGroupId);
  }
  return result;
}

/** Refresh one editable stack and linked species from Pinkka. */
export async function refreshEditableStackFromPinkka(params: {
  groupId: string;
  stackId: string;
  ownerId: string;
  onProgress?: PinkkaImportProgressCallback;
  shouldInterrupt?: () => boolean;
  includeSpeciesImages?: boolean;
}): Promise<RefreshStackFromPinkkaResult> {
  const includeSpeciesImages = params.includeSpeciesImages ?? true;
  const stackRef = doc(db, "groups", params.groupId, "stacks", params.stackId);
  const stackDoc = await getDoc(stackRef);
  if (!stackDoc.exists()) {
    throw new Error(`Stack ${params.stackId} was not found.`);
  }

  const stackData = stackDoc.data();
  const pinkkaStackId = stackData.pinkkaRef?.stackId;
  if (typeof pinkkaStackId !== "number") {
    throw new Error(`Stack ${params.stackId} is not linked to Pinkka.`);
  }

  const groupDoc = await getDoc(doc(db, "groups", params.groupId));
  const pinkkaGroupId =
    typeof stackData.pinkkaRef?.groupId === "number"
      ? stackData.pinkkaRef.groupId
      : groupDoc.data()?.pinkkaRef?.groupId;
  if (typeof pinkkaGroupId !== "number") {
    throw new Error(`Stack ${params.stackId} is not linked to a Pinkka group.`);
  }

  const importedStackEntity = await getImportedPinkkaStackEntity({
    groupId: pinkkaGroupId,
    stackId: pinkkaStackId,
  });
  if (!importedStackEntity) {
    throw new Error(`Imported Pinkka stack ${pinkkaStackId} was not found.`);
  }

  const stackRefreshResult = await buildEditableStackRefreshOperations({
    groupId: params.groupId,
    ownerId: params.ownerId,
    pinkkaGroupId,
    sourceStack: importedStackEntity,
    importedSpecies: await getImportedPinkkaSpeciesEntries(
      pinkkaGroupId,
      pinkkaStackId,
    ),
    order: typeof stackData.order === "number" ? stackData.order : 0,
    existingStack: {
      id: params.stackId,
      data: stackData,
    },
    includeSpeciesImages,
    shouldInterrupt: params.shouldInterrupt,
  });

  await commitSetOperationsInBatches(
    stackRefreshResult.operations,
    getPinkkaImportBatchCommitOptions(stackRefreshResult.operations.length),
  );
  await commitDeleteReferencesInBatches(
    stackRefreshResult.deleteRefs,
    getPinkkaImportBatchCommitOptions(stackRefreshResult.deleteRefs.length),
  );
  await markPinkkaStackAndSpeciesImportCompleted({
    groupId: pinkkaGroupId,
    stackId: stackRefreshResult.pinkkaStackId,
    speciesIds: stackRefreshResult.pinkkaSpeciesIds,
  });
  await markPinkkaGroupImportCompletedDirect(pinkkaGroupId);
  return {
    createdSpeciesCount: stackRefreshResult.createdSpeciesCount,
    updatedSpeciesCount: stackRefreshResult.updatedSpeciesCount,
    deletedSpeciesCount: stackRefreshResult.deletedSpeciesCount,
  };
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
  /** Timestamp when an import/re-import for this entity started. */
  importStarted?: Timestamp;
  /** Timestamp when the most recent import/re-import completed. */
  importCompleted?: Timestamp;
  /** Original Pinkka API response payload. */
  entity: T;
};

function getPinkkaEntityDocumentRef(pathSegments: string[]) {
  const [path, ...rest] = pathSegments;
  if (!path) {
    throw new Error("Pinkka entity path is required.");
  }

  return doc(db, path, ...rest);
}

function setPinkkaGroupImportStatus(
  groupId: number,
  status: PinkkaImportStatus,
): void {
  pinkkaGroupImportStatusCache.set(groupId, status);
}

function setPinkkaStackImportStatus(
  stackId: number,
  status: PinkkaImportStatus,
): void {
  pinkkaStackImportStatusCache.set(stackId, status);
}

function setPinkkaSpeciesImportStatus(
  speciesId: number,
  status: PinkkaImportStatus,
): void {
  pinkkaSpeciesImportStatusCache.set(speciesId, status);
}

async function markPinkkaEntityImportStarted(
  pathSegments: string[],
): Promise<void> {
  await setDoc(
    getPinkkaEntityDocumentRef(pathSegments),
    {
      importStarted: Timestamp.now(),
      importCompleted: deleteField(),
    },
    { merge: true },
  );
}

async function markPinkkaEntityImportCompleted(
  pathSegments: string[],
): Promise<void> {
  await setDoc(
    getPinkkaEntityDocumentRef(pathSegments),
    {
      importStarted: deleteField(),
      importCompleted: Timestamp.now(),
    },
    { merge: true },
  );
}

async function markPinkkaGroupImportStarted(groupId: number): Promise<void> {
  await markPinkkaEntityImportStarted(getPinkkaGroupPath(groupId));
  setPinkkaGroupImportStatus(groupId, IMPORTED_INCOMPLETE_STATUS);
}

async function markPinkkaGroupImportCompleted(groupId: number): Promise<void> {
  if (await hasIncompleteImportsInGroupDescendants(groupId)) {
    setPinkkaGroupImportStatus(groupId, IMPORTED_INCOMPLETE_STATUS);
    return;
  }
  await markPinkkaEntityImportCompleted(getPinkkaGroupPath(groupId));
  setPinkkaGroupImportStatus(groupId, IMPORTED_COMPLETE_STATUS);
}

async function markPinkkaStackImportStarted(
  groupId: number,
  stackId: number,
): Promise<void> {
  await markPinkkaEntityImportStarted(getPinkkaStackPath(groupId, stackId));
  setPinkkaStackImportStatus(stackId, IMPORTED_INCOMPLETE_STATUS);
}

async function markPinkkaStackImportCompleted(
  groupId: number,
  stackId: number,
): Promise<void> {
  if (await hasIncompleteImportsInStackDescendants(groupId, stackId)) {
    setPinkkaStackImportStatus(stackId, IMPORTED_INCOMPLETE_STATUS);
    return;
  }
  await markPinkkaEntityImportCompleted(getPinkkaStackPath(groupId, stackId));
  setPinkkaStackImportStatus(stackId, IMPORTED_COMPLETE_STATUS);
}

async function markPinkkaSpeciesImportStarted(
  groupId: number,
  stackId: number,
  speciesId: number,
): Promise<void> {
  await markPinkkaEntityImportStarted(
    getPinkkaSpeciesPath(groupId, stackId, speciesId),
  );
  setPinkkaSpeciesImportStatus(speciesId, IMPORTED_INCOMPLETE_STATUS);
}

async function markPinkkaSpeciesImportCompleted(
  groupId: number,
  stackId: number,
  speciesId: number,
): Promise<void> {
  await markPinkkaEntityImportCompleted(
    getPinkkaSpeciesPath(groupId, stackId, speciesId),
  );
  setPinkkaSpeciesImportStatus(speciesId, IMPORTED_COMPLETE_STATUS);
}

/**
 * Keep Pinkka management status markers in sync with canonical imports without
 * issuing one unbounded burst of writes for large stacks.
 */
async function markPinkkaStackAndSpeciesImportCompleted(params: {
  groupId: number;
  stackId: number;
  speciesIds: number[];
}): Promise<void> {
  const uniqueSpeciesIds = [
    ...new Set(
      params.speciesIds.filter((speciesId) => Number.isFinite(speciesId)),
    ),
  ];
  const importCompleted = Timestamp.now();
  const markerRefs = [
    ...uniqueSpeciesIds.map((speciesId) =>
      getPinkkaEntityDocumentRef(
        getPinkkaSpeciesPath(params.groupId, params.stackId, speciesId),
      ),
    ),
    getPinkkaEntityDocumentRef(
      getPinkkaStackPath(params.groupId, params.stackId),
    ),
  ];

  const markerCommitOptions = getPinkkaImportBatchCommitOptions(
    markerRefs.length,
  );
  const markerChunks = chunkArray(
    markerRefs,
    markerCommitOptions.maxOperationsPerBatch ??
      PINKKA_IMPORT_SMALL_BATCH_WRITE_MAX,
  );
  for (
    let markerChunkIndex = 0;
    markerChunkIndex < markerChunks.length;
    markerChunkIndex += 1
  ) {
    const markerChunk = markerChunks[markerChunkIndex];
    await commitBatchWithAdaptiveRetry(async () => {
      const batch = writeBatch(db);
      for (const markerRef of markerChunk) {
        batch.set(
          markerRef,
          {
            importStarted: deleteField(),
            importCompleted,
          },
          { merge: true },
        );
      }
      await batch.commit();
    });
    if (markerChunkIndex < markerChunks.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, markerCommitOptions.cooldownMs ?? 0),
      );
    }
  }

  uniqueSpeciesIds.forEach((speciesId) => {
    setPinkkaSpeciesImportStatus(speciesId, IMPORTED_COMPLETE_STATUS);
  });
  setPinkkaStackImportStatus(params.stackId, IMPORTED_COMPLETE_STATUS);
}

/** Mark a Pinkka group as fully imported without descendant rechecks. */
async function markPinkkaGroupImportCompletedDirect(
  groupId: number,
): Promise<void> {
  await setDoc(
    getPinkkaEntityDocumentRef(getPinkkaGroupPath(groupId)),
    {
      importStarted: deleteField(),
      importCompleted: Timestamp.now(),
    },
    { merge: true },
  );
  setPinkkaGroupImportStatus(groupId, IMPORTED_COMPLETE_STATUS);
}

async function writePinkkaEntity<T>(
  pathSegments: string[],
  entity: T,
): Promise<void> {
  const payload: PinkkaEntityDocument<T> = {
    importDate: Timestamp.now(),
    entity,
  };
  await setDoc(getPinkkaEntityDocumentRef(pathSegments), payload, {
    merge: true,
  });
}

function getPinkkaGroupPath(groupId: number): string[] {
  return [PINKKA_COLLECTION, String(groupId)];
}

function getPinkkaStackPath(groupId: number, stackId: number): string[] {
  return [...getPinkkaGroupPath(groupId), "stacks", String(stackId)];
}

function getPinkkaSpeciesPath(
  groupId: number,
  stackId: number,
  speciesId: number,
): string[] {
  return [
    ...getPinkkaStackPath(groupId, stackId),
    "species",
    String(speciesId),
  ];
}

async function hasIncompleteImportsInStackDescendants(
  groupId: number,
  stackId: number,
): Promise<boolean> {
  const speciesSnapshot = await getDocs(
    collection(
      db,
      PINKKA_COLLECTION,
      String(groupId),
      "stacks",
      String(stackId),
      "species",
    ),
  );
  return speciesSnapshot.docs.some((docSnapshot) =>
    hasImportStartedFlag(docSnapshot.data()),
  );
}

async function hasIncompleteImportsInGroupDescendants(
  groupId: number,
): Promise<boolean> {
  const stackSnapshot = await getDocs(
    collection(db, PINKKA_COLLECTION, String(groupId), "stacks"),
  );

  for (const stackDoc of stackSnapshot.docs) {
    if (hasImportStartedFlag(stackDoc.data())) {
      return true;
    }

    const stackId = Number.parseInt(stackDoc.id, 10);
    if (!Number.isFinite(stackId)) {
      continue;
    }

    if (await hasIncompleteImportsInStackDescendants(groupId, stackId)) {
      return true;
    }
  }

  return false;
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
    if (
      (groupDetail.subPinkkas ?? []).some((subStack) => subStack.id === stackId)
    ) {
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
  const resolvedGroup =
    groupEntity ?? (await fetchPinkkaGroupWithStacks(groupId));
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

/** Fetch test preferences for a user by uid. */
export async function getUserTestPreferences(
  userId: string,
): Promise<TestPreferences | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return null;
  const testPreferences =
    userDoc.data().preferences?.test ?? userDoc.data().preferences?.quiz;
  return testPreferences ? normalizeTestPreferences(testPreferences) : null;
}

/** Update test preferences for a user by uid. */
export async function updateUserTestPreferences(
  userId: string,
  preferences: TestPreferences,
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    "preferences.test": preferences,
    "preferences.quiz": deleteField(),
  });
}

/** Fetch home preferences for a user by uid. */
export async function getUserHomePreferences(
  userId: string,
): Promise<HomePreferences | null> {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return null;

  const favoriteGroupIds = normalizePreferenceIds(
    userDoc.data().preferences?.home?.favoriteGroupIds,
  );
  const favoriteStackIds = normalizePreferenceIds(
    userDoc.data().preferences?.home?.favoriteStackIds,
  );

  return {
    favoriteGroupIds,
    favoriteStackIds,
  };
}

/** Update home preferences for a user by uid. */
export async function updateUserHomePreferences(
  userId: string,
  preferences: Partial<HomePreferences>,
): Promise<void> {
  const updates: Record<string, string[]> = {};

  if ("favoriteGroupIds" in preferences) {
    updates["preferences.home.favoriteGroupIds"] = normalizePreferenceIds(
      preferences.favoriteGroupIds,
    );
  }

  if ("favoriteStackIds" in preferences) {
    updates["preferences.home.favoriteStackIds"] = normalizePreferenceIds(
      preferences.favoriteStackIds,
    );
  }

  if (Object.keys(updates).length === 0) return;

  await updateDoc(doc(db, "users", userId), updates);
}

// Learning progress operations
/** Fetch learning progress for a specific species/name variant. */
export async function getLearningProgress(
  userId: string,
  speciesId: string,
  nameType: LearningNameType,
): Promise<LearningProgress | null> {
  const docId = buildLearningProgressDocId(userId, speciesId, nameType);
  try {
    const progressDoc = await getDoc(doc(db, "learningProgress", docId));
    if (!progressDoc.exists()) return null;

    const data = progressDoc.data();
    return {
      id: progressDoc.id,
      userId: data.userId,
      speciesId: data.speciesId,
      parentStackId:
        typeof data.parentStackId === "string" ? data.parentStackId : undefined,
      parentGroupId:
        typeof data.parentGroupId === "string" ? data.parentGroupId : undefined,
      nameType: data.nameType as LearningNameType,
      accuracyStabilityDays: data.accuracyStabilityDays ?? 0.5,
      speedStabilityDays: data.speedStabilityDays ?? 0.5,
      lastReviewedAt: data.lastReviewedAt?.toDate() ?? new Date(0),
      reviewCount: data.reviewCount ?? 0,
      averageResponseMs: data.averageResponseMs ?? 0,
    } as LearningProgress;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (
      code === "permission-denied" ||
      code === "firestore/permission-denied"
    ) {
      // Treat permission-denied as "no readable progress" to keep learning mode usable.
      return null;
    }
    throw error;
  }
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

function createEmptyLearningStatusHistogram(
  total: number,
): StackLearningHistogram["species"] {
  return {
    total,
    new: { count: total, percent: total > 0 ? 100 : 0 },
    learning: { count: 0, percent: 0 },
    strengthening: { count: 0, percent: 0 },
    mastered: { count: 0, percent: 0 },
  };
}

function createScientificProgressSummaryPercent(
  histogram: LearningStatusHistogram,
): number {
  return histogram.mastered.percent;
}

function createStackScientificProgressSummary(
  userId: string,
  stackId: string,
  groupId: string | undefined,
  histogram: LearningStatusHistogram,
  updatedAt: Date,
): StackScientificProgress {
  return {
    id: `${userId}_${stackId}`,
    userId,
    stackId,
    groupId,
    masteredScientificCount: histogram.mastered.count,
    totalSpeciesCount: histogram.total,
    masteredScientificPercent:
      createScientificProgressSummaryPercent(histogram),
    updatedAt,
  };
}

function createGroupScientificProgressSummary(
  userId: string,
  groupId: string,
  masteredScientificCount: number,
  totalSpeciesCount: number,
  updatedAt: Date,
): GroupScientificProgress {
  return {
    id: `${userId}_${groupId}`,
    userId,
    groupId,
    masteredScientificCount,
    totalSpeciesCount,
    masteredScientificPercent:
      totalSpeciesCount > 0
        ? Math.round((masteredScientificCount / totalSpeciesCount) * 100)
        : 0,
    updatedAt,
  };
}

function createGlobalScientificProgressSummary(
  userId: string,
  masteredScientificCount: number,
  totalSpeciesCount: number,
  updatedAt: Date,
): GlobalScientificProgress {
  return {
    id: userId,
    userId,
    masteredScientificCount,
    totalSpeciesCount,
    masteredScientificPercent:
      totalSpeciesCount > 0
        ? Math.round((masteredScientificCount / totalSpeciesCount) * 100)
        : 0,
    updatedAt,
  };
}

function toStackScientificProgressFromDoc(
  docId: string,
  data: DocumentData,
): StackScientificProgress {
  return {
    id: docId,
    userId: data.userId as string,
    stackId: data.stackId as string,
    groupId: typeof data.groupId === "string" ? data.groupId : undefined,
    masteredScientificCount: data.masteredScientificCount ?? 0,
    totalSpeciesCount: data.totalSpeciesCount ?? 0,
    masteredScientificPercent: data.masteredScientificPercent ?? 0,
    updatedAt: data.updatedAt?.toDate() ?? new Date(0),
  };
}

function toGroupScientificProgressFromDoc(
  docId: string,
  data: DocumentData,
): GroupScientificProgress {
  return {
    id: docId,
    userId: data.userId as string,
    groupId: data.groupId as string,
    masteredScientificCount: data.masteredScientificCount ?? 0,
    totalSpeciesCount: data.totalSpeciesCount ?? 0,
    masteredScientificPercent: data.masteredScientificPercent ?? 0,
    updatedAt: data.updatedAt?.toDate() ?? new Date(0),
  };
}

function toGlobalScientificProgressFromDoc(
  docId: string,
  data: DocumentData,
): GlobalScientificProgress {
  return {
    id: docId,
    userId: data.userId as string,
    masteredScientificCount: data.masteredScientificCount ?? 0,
    totalSpeciesCount: data.totalSpeciesCount ?? 0,
    masteredScientificPercent: data.masteredScientificPercent ?? 0,
    updatedAt: data.updatedAt?.toDate() ?? new Date(0),
  };
}

async function computeStackScientificProgressFallback(
  userId: string,
  stackIds: string[],
): Promise<Map<string, StackScientificProgress>> {
  const stacks = await Promise.all(
    stackIds.map((stackId) => getStack(stackId)),
  );
  const stackSpeciesEntries = await Promise.all(
    stackIds.map(
      async (stackId) => [stackId, await getSpecies(stackId)] as const,
    ),
  );
  const uniqueSpeciesIds = [
    ...new Set(
      stackSpeciesEntries.flatMap(([, species]) =>
        species.map((item) => item.id),
      ),
    ),
  ];
  const progressMap = await getLearningProgressForSpeciesIds(
    userId,
    uniqueSpeciesIds,
  );
  const now = new Date();
  const summaryMap = new Map<string, StackScientificProgress>();

  stackSpeciesEntries.forEach(([stackId, species], index) => {
    const histogram = buildStackLearningHistogram(
      species.map((item) => item.id),
      progressMap,
      "scientific",
      now,
    );
    summaryMap.set(
      stackId,
      createStackScientificProgressSummary(
        userId,
        stackId,
        stacks[index]?.parentGroupId,
        histogram,
        now,
      ),
    );
  });

  return summaryMap;
}

async function computeGroupScientificProgressFallback(
  userId: string,
  groupIds: string[],
): Promise<Map<string, GroupScientificProgress>> {
  const groupStacksEntries = await Promise.all(
    groupIds.map(
      async (groupId) => [groupId, await getStacks(groupId)] as const,
    ),
  );
  const uniqueStackIds = [
    ...new Set(
      groupStacksEntries.flatMap(([, stacks]) =>
        stacks.map((stack) => stack.id),
      ),
    ),
  ];
  const stackProgressMap = await computeStackScientificProgressFallback(
    userId,
    uniqueStackIds,
  );
  const now = new Date();
  const summaryMap = new Map<string, GroupScientificProgress>();

  groupStacksEntries.forEach(([groupId, stacks]) => {
    const masteredScientificCount = stacks.reduce(
      (total, stack) =>
        total + (stackProgressMap.get(stack.id)?.masteredScientificCount ?? 0),
      0,
    );
    const totalSpeciesCount = stacks.reduce(
      (total, stack) =>
        total + (stackProgressMap.get(stack.id)?.totalSpeciesCount ?? 0),
      0,
    );
    summaryMap.set(
      groupId,
      createGroupScientificProgressSummary(
        userId,
        groupId,
        masteredScientificCount,
        totalSpeciesCount,
        now,
      ),
    );
  });

  return summaryMap;
}

async function computeGlobalScientificProgressFallback(
  userId: string,
): Promise<GlobalScientificProgress> {
  const stacks = await getStacks();
  const stackProgressMap = await computeStackScientificProgressFallback(
    userId,
    stacks.map((stack) => stack.id),
  );
  const now = new Date();
  const masteredScientificCount = [...stackProgressMap.values()].reduce(
    (total, progress) => total + progress.masteredScientificCount,
    0,
  );
  const totalSpeciesCount = [...stackProgressMap.values()].reduce(
    (total, progress) => total + progress.totalSpeciesCount,
    0,
  );

  return createGlobalScientificProgressSummary(
    userId,
    masteredScientificCount,
    totalSpeciesCount,
    now,
  );
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
      const fallbackTotal =
        data.species?.total ??
        data.genus?.total ??
        data.family?.total ??
        data.either?.total ??
        data.scientific?.total ??
        data.vernacular?.total ??
        0;
      const species =
        data.species ??
        data.either ??
        data.scientific ??
        createEmptyLearningStatusHistogram(fallbackTotal);
      const genus =
        data.genus ??
        (typeof data.scientific === "object"
          ? data.scientific
          : createEmptyLearningStatusHistogram(fallbackTotal));
      const family =
        data.family ??
        (typeof data.scientific === "object"
          ? data.scientific
          : createEmptyLearningStatusHistogram(fallbackTotal));
      histogramMap.set(stackId, {
        id: docSnapshot.id,
        userId: data.userId,
        stackId,
        species,
        genus,
        family,
        updatedAt: data.updatedAt?.toDate() ?? new Date(0),
      } as StackLearningHistogram);
    });
  }

  return histogramMap;
}

/** Fetch stack mastered-scientific-name progress summaries for a user. */
export async function getStackScientificProgressSummaries(
  userId: string,
  stackIds: string[],
  options?: { allowFallback?: boolean },
): Promise<Map<string, StackScientificProgress>> {
  const summaryMap = new Map<string, StackScientificProgress>();
  if (stackIds.length === 0) return summaryMap;

  const uniqueStackIds = [...new Set(stackIds)];
  const chunks = chunkArray(uniqueStackIds, 10);
  for (const chunk of chunks) {
    const snapshot = await getDocs(
      query(
        collection(db, "stackScientificProgress"),
        where("userId", "==", userId),
        where("stackId", "in", chunk),
      ),
    );

    snapshot.docs.forEach((docSnapshot) => {
      const summary = toStackScientificProgressFromDoc(
        docSnapshot.id,
        docSnapshot.data(),
      );
      summaryMap.set(summary.stackId, summary);
    });
  }

  const allowFallback = options?.allowFallback ?? true;
  const missingStackIds = uniqueStackIds.filter(
    (stackId) => !summaryMap.has(stackId),
  );
  if (allowFallback && missingStackIds.length > 0) {
    const fallbackMap = await computeStackScientificProgressFallback(
      userId,
      missingStackIds,
    );
    fallbackMap.forEach((summary, stackId) => {
      summaryMap.set(stackId, summary);
    });
  }

  return summaryMap;
}

/** Fetch group mastered-scientific-name progress summaries for a user. */
export async function getGroupScientificProgressSummaries(
  userId: string,
  groupIds: string[],
  options?: { allowFallback?: boolean },
): Promise<Map<string, GroupScientificProgress>> {
  const summaryMap = new Map<string, GroupScientificProgress>();
  if (groupIds.length === 0) return summaryMap;

  const uniqueGroupIds = [...new Set(groupIds)];
  const chunks = chunkArray(uniqueGroupIds, 10);
  for (const chunk of chunks) {
    const snapshot = await getDocs(
      query(
        collection(db, "groupScientificProgress"),
        where("userId", "==", userId),
        where("groupId", "in", chunk),
      ),
    );

    snapshot.docs.forEach((docSnapshot) => {
      const summary = toGroupScientificProgressFromDoc(
        docSnapshot.id,
        docSnapshot.data(),
      );
      summaryMap.set(summary.groupId, summary);
    });
  }

  const allowFallback = options?.allowFallback ?? true;
  const missingGroupIds = uniqueGroupIds.filter(
    (groupId) => !summaryMap.has(groupId),
  );
  if (allowFallback && missingGroupIds.length > 0) {
    const fallbackMap = await computeGroupScientificProgressFallback(
      userId,
      missingGroupIds,
    );
    fallbackMap.forEach((summary, groupId) => {
      summaryMap.set(groupId, summary);
    });
  }

  return summaryMap;
}

/** Fetch the global mastered-scientific-name progress summary for a user. */
export async function getGlobalScientificProgressSummary(
  userId: string,
): Promise<GlobalScientificProgress> {
  const docSnapshot = await getDoc(doc(db, "globalScientificProgress", userId));
  if (docSnapshot.exists()) {
    return toGlobalScientificProgressFromDoc(
      docSnapshot.id,
      docSnapshot.data(),
    );
  }

  return computeGlobalScientificProgressFallback(userId);
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
      species: record.species,
      genus: record.genus,
      family: record.family,
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

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate?.() ?? new Date(0);
  }
  return new Date(0);
}

type FirestoreDocLike = {
  id: string;
  data: () => DocumentData | undefined;
  ref?: DocumentReference;
};

function toGroupFromDoc(groupDoc: FirestoreDocLike): Group {
  const data = groupDoc.data() ?? {};
  return {
    id: groupDoc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Group;
}

function toStackFromDoc(stackDoc: FirestoreDocLike): Stack {
  const data = stackDoc.data() ?? {};
  const learningItemIds = getStackLinkedLearningItemIdsFromData(data);
  return {
    id: stackDoc.id,
    ...data,
    ...(learningItemIds.length > 0
      ? {
          learningItemIds,
          speciesIds: learningItemIds,
        }
      : {}),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Stack;
}

function toLearningItemFromDoc(
  learningItemDoc: FirestoreDocLike,
): LearningItem {
  const data = learningItemDoc.data() ?? {};
  return {
    id: learningItemDoc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as LearningItem;
}

function toSpeciesFromDoc(speciesDoc: FirestoreDocLike): Species {
  return toLearningItemFromDoc(speciesDoc) as Species;
}

function buildCanonicalId(): string {
  const bytes = new Uint8Array(NANOID_SIZE);
  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => NANOID_ALPHABET[byte & 63]).join("");
}

function getCanonicalLearningItemRef(
  learningItemId: string,
): DocumentReference {
  return doc(db, CANONICAL_LEARNING_ITEMS_COLLECTION, learningItemId);
}

function getLegacyCanonicalSpeciesRef(speciesId: string): DocumentReference {
  return doc(db, LEGACY_CANONICAL_SPECIES_COLLECTION, speciesId);
}

async function getCanonicalLearningItemSnapshot(
  learningItemId: string,
): Promise<FirestoreDocLike | null> {
  const canonicalDoc = await getDoc(
    getCanonicalLearningItemRef(learningItemId),
  );
  if (canonicalDoc.exists()) {
    return canonicalDoc;
  }

  const legacyDoc = await getDoc(getLegacyCanonicalSpeciesRef(learningItemId));
  return legacyDoc.exists() ? legacyDoc : null;
}

async function updateCanonicalLearningItemDocument(
  learningItemId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const targetDoc = await getCanonicalLearningItemSnapshot(learningItemId);
  const targetRef = targetDoc
    ? (targetDoc.ref ?? getCanonicalLearningItemRef(learningItemId))
    : getCanonicalLearningItemRef(learningItemId);
  await updateDoc(targetRef, data as DocumentData);
}

function getStackLinkedLearningItemIds(
  stack: Pick<Stack, "learningItemIds" | "speciesIds">,
): string[] {
  return dedupeIds([
    ...(stack.learningItemIds ?? []),
    ...(stack.speciesIds ?? []),
  ]);
}

function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );
}

type ContentSourceKeyParams = {
  source: string;
  entityType: string;
  externalId: string;
};

type ContentEntityData = GroupData | StackData | SpeciesData;

type SourceBackedEntity<T extends ContentEntityData> = {
  data: T;
  sourceRecords?: ContentSourceRecord<T>[];
  manualOverrides?: Partial<T>;
};

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function buildContentSourceKey({
  source,
  entityType,
  externalId,
}: ContentSourceKeyParams): string {
  return `${source}:${entityType}:${externalId}`;
}

function getContentSourceKeys<T extends ContentEntityData>(
  records: ContentSourceRecord<T>[] | undefined,
): string[] | undefined {
  if (!records || records.length === 0) {
    return undefined;
  }
  const keys = dedupeIds(
    records.map((record) =>
      buildContentSourceKey({
        source: record.source,
        entityType: record.entityType,
        externalId: record.externalId,
      }),
    ),
  );
  return keys.length > 0 ? keys : undefined;
}

function mergeSourceContentData<T extends ContentEntityData>(
  sourceData: T,
  manualOverrides?: Partial<T>,
): T {
  return {
    ...sourceData,
    ...(manualOverrides ?? {}),
  };
}

function deriveManualOverrides<T extends ContentEntityData>(
  sourceData: T,
  currentData: Partial<T> | undefined,
): Partial<T> | undefined {
  if (!currentData) {
    return undefined;
  }

  const overrides: Partial<T> = {};
  for (const [key, value] of Object.entries(currentData) as Array<
    [keyof T, T[keyof T]]
  >) {
    if (value === undefined) {
      continue;
    }
    if (
      !areSyncComparableValuesEqual(
        value,
        sourceData[key as keyof T] as unknown,
      )
    ) {
      overrides[key] = value;
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function upsertContentSourceRecord<T extends ContentEntityData>(
  records: ContentSourceRecord<T>[] | undefined,
  nextRecord: ContentSourceRecord<T>,
): ContentSourceRecord<T>[] {
  const previousRecords = records ?? [];
  const filteredRecords = previousRecords.filter(
    (record) =>
      !(
        record.source === nextRecord.source &&
        record.entityType === nextRecord.entityType &&
        record.externalId === nextRecord.externalId
      ),
  );
  return [...filteredRecords, nextRecord];
}

function buildPinkkaSourceRecord<T extends ContentEntityData>(params: {
  entityType: string;
  externalId: string | number;
  data: T;
  metadata?: Record<string, string | number | boolean | null>;
}): ContentSourceRecord<T> {
  return {
    source: "pinkka",
    entityType: params.entityType,
    externalId: String(params.externalId),
    data: params.data,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };
}

function getEntityManualOverrides<T extends ContentEntityData>(
  entity: SourceBackedEntity<T> | Partial<SourceBackedEntity<T>> | undefined,
  sourceData: T,
): Partial<T> | undefined {
  if (!entity) {
    return undefined;
  }

  return (
    entity.manualOverrides ??
    deriveManualOverrides(sourceData, entity.data as Partial<T> | undefined)
  );
}

async function updateStackSpeciesLinks(
  stackId: string,
  speciesIds: string[],
): Promise<void> {
  const nestedLocation = await resolveNestedStackLocation(stackId);
  const targetRef = nestedLocation
    ? doc(db, "groups", nestedLocation.groupId, "stacks", stackId)
    : doc(db, "stacks", stackId);
  const nextLearningItemIds = dedupeIds(speciesIds);
  await updateDoc(targetRef, {
    [STACK_LEARNING_ITEM_IDS_FIELD]: nextLearningItemIds,
    [LEGACY_STACK_SPECIES_IDS_FIELD]: nextLearningItemIds,
    updatedAt: Timestamp.now(),
  });
}

function getStackLinkedLearningItemIdsFromData(
  data: Partial<Stack> | DocumentData,
): string[] {
  return dedupeIds([
    ...((((data as Partial<Stack>).learningItemIds ??
      data[STACK_LEARNING_ITEM_IDS_FIELD]) as string[] | undefined) ?? []),
    ...((((data as Partial<Stack>).speciesIds ??
      data[LEGACY_STACK_SPECIES_IDS_FIELD]) as string[] | undefined) ?? []),
  ]);
}

async function getCanonicalLearningItemDocsByIds(
  learningItemIds: string[],
): Promise<LearningItem[]> {
  const uniqueIds = dedupeIds(learningItemIds);
  if (uniqueIds.length === 0) {
    return [];
  }

  const learningItemsById = new Map<string, LearningItem>();
  const canonicalSnapshots = await Promise.all(
    chunkArray(uniqueIds, FIRESTORE_IN_QUERY_MAX).map((chunk) =>
      getDocs(
        query(
          collection(db, CANONICAL_LEARNING_ITEMS_COLLECTION),
          where(documentId(), "in", chunk),
        ),
      ),
    ),
  );
  canonicalSnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((learningItemDoc) => {
      learningItemsById.set(
        learningItemDoc.id,
        toLearningItemFromDoc(learningItemDoc),
      );
    });
  });

  const missingIds = uniqueIds.filter((learningItemId) => {
    return !learningItemsById.has(learningItemId);
  });
  const legacySnapshots = await Promise.all(
    chunkArray(missingIds, FIRESTORE_IN_QUERY_MAX).map((chunk) =>
      getDocs(
        query(
          collection(db, LEGACY_CANONICAL_SPECIES_COLLECTION),
          where(documentId(), "in", chunk),
        ),
      ),
    ),
  );
  legacySnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((learningItemDoc) => {
      if (!learningItemsById.has(learningItemDoc.id)) {
        learningItemsById.set(
          learningItemDoc.id,
          toLearningItemFromDoc(learningItemDoc),
        );
      }
    });
  });

  return uniqueIds.flatMap((learningItemId) => {
    const learningItem = learningItemsById.get(learningItemId);
    return learningItem ? [learningItem] : [];
  });
}

async function getCanonicalLearningItemsByPinkkaSpeciesIds(
  pinkkaSpeciesIds: number[],
): Promise<Map<number, LearningItem>> {
  const uniqueIds = [...new Set(pinkkaSpeciesIds)].filter((value) =>
    Number.isFinite(value),
  );
  const learningItemsByPinkkaSpeciesId = new Map<number, LearningItem>();

  for (const chunk of chunkArray(uniqueIds, FIRESTORE_IN_QUERY_MAX)) {
    const snapshots = await Promise.all([
      getDocs(
        query(
          collection(db, CANONICAL_LEARNING_ITEMS_COLLECTION),
          where("pinkkaRef.speciesId", "in", chunk),
        ),
      ),
      getDocs(
        query(
          collection(db, LEGACY_CANONICAL_SPECIES_COLLECTION),
          where("pinkkaRef.speciesId", "in", chunk),
        ),
      ),
    ]);
    for (const snapshot of snapshots) {
      for (const learningItemDoc of snapshot.docs) {
        const learningItem = toLearningItemFromDoc(learningItemDoc);
        const pinkkaSpeciesId = learningItem.pinkkaRef?.speciesId;
        if (typeof pinkkaSpeciesId === "number") {
          learningItemsByPinkkaSpeciesId.set(pinkkaSpeciesId, learningItem);
        }
      }
    }
  }

  return learningItemsByPinkkaSpeciesId;
}

async function ensureCanonicalLearningItemDocument(
  learningItemId: string,
): Promise<LearningItem | null> {
  const canonicalDoc = await getDoc(
    getCanonicalLearningItemRef(learningItemId),
  );
  if (canonicalDoc.exists()) {
    return toLearningItemFromDoc(canonicalDoc);
  }

  const legacyCanonicalDoc = await getDoc(
    getLegacyCanonicalSpeciesRef(learningItemId),
  );
  if (legacyCanonicalDoc.exists()) {
    const now = Timestamp.now();
    await setDoc(getCanonicalLearningItemRef(learningItemId), {
      ...legacyCanonicalDoc.data(),
      updatedAt: now,
    });
    const migratedDoc = await getDoc(
      getCanonicalLearningItemRef(learningItemId),
    );
    return migratedDoc.exists()
      ? toLearningItemFromDoc(migratedDoc)
      : toLearningItemFromDoc(legacyCanonicalDoc);
  }

  const nestedLocation = await resolveNestedSpeciesLocation(learningItemId);
  if (!nestedLocation) {
    return null;
  }

  const nestedLearningItem = toLearningItemFromDoc(nestedLocation.doc);
  const now = Timestamp.now();
  await setDoc(getCanonicalLearningItemRef(learningItemId), {
    learningItemId,
    data: nestedLearningItem.data,
    ...(nestedLearningItem.sourceRecords
      ? { sourceRecords: nestedLearningItem.sourceRecords }
      : {}),
    ...(getContentSourceKeys(nestedLearningItem.sourceRecords)
      ? { sourceKeys: getContentSourceKeys(nestedLearningItem.sourceRecords) }
      : {}),
    ...(nestedLearningItem.manualOverrides
      ? { manualOverrides: nestedLearningItem.manualOverrides }
      : {}),
    ...(nestedLearningItem.pinkkaRef
      ? { pinkkaRef: nestedLearningItem.pinkkaRef }
      : {}),
    ...(nestedLearningItem.testImageIds
      ? { testImageIds: nestedLearningItem.testImageIds }
      : {}),
    ...(typeof nestedLearningItem.isHidden === "boolean"
      ? { isHidden: nestedLearningItem.isHidden }
      : {}),
    ...(nestedLearningItem.importId
      ? { importId: nestedLearningItem.importId }
      : {}),
    ownerId: nestedLearningItem.ownerId,
    createdAt: nestedLocation.doc.data()?.createdAt ?? now,
    updatedAt: now,
  });

  const createdDoc = await getDoc(getCanonicalLearningItemRef(learningItemId));
  return createdDoc.exists()
    ? toLearningItemFromDoc(createdDoc)
    : nestedLearningItem;
}

async function findCanonicalLearningItemBySourceRecord(
  record: ContentSourceRecord<LearningItemData>,
): Promise<LearningItem | null> {
  const sourceKey = buildContentSourceKey({
    source: record.source,
    entityType: record.entityType,
    externalId: record.externalId,
  });

  for (const collectionName of [
    CANONICAL_LEARNING_ITEMS_COLLECTION,
    LEGACY_CANONICAL_SPECIES_COLLECTION,
  ]) {
    const keyedSnapshot = await getDocs(
      query(
        collection(db, collectionName),
        where("sourceKeys", "array-contains", sourceKey),
        limit(1),
      ),
    );
    const keyedDoc = keyedSnapshot.docs[0];
    if (keyedDoc) {
      return toLearningItemFromDoc(keyedDoc);
    }
  }

  if (record.source === "pinkka" && record.entityType === "species") {
    const numericExternalId = Number(record.externalId);
    if (Number.isFinite(numericExternalId)) {
      for (const collectionName of [
        CANONICAL_LEARNING_ITEMS_COLLECTION,
        LEGACY_CANONICAL_SPECIES_COLLECTION,
      ]) {
        const pinkkaSnapshot = await getDocs(
          query(
            collection(db, collectionName),
            where("pinkkaRef.speciesId", "==", numericExternalId),
            limit(1),
          ),
        );
        const pinkkaDoc = pinkkaSnapshot.docs[0];
        if (pinkkaDoc) {
          return toLearningItemFromDoc(pinkkaDoc);
        }
      }

      try {
        const nestedSnapshot = await getDocs(
          query(
            collectionGroup(db, "species"),
            where("pinkkaRef.speciesId", "==", numericExternalId),
            limit(1),
          ),
        );
        const nestedDoc = nestedSnapshot.docs[0];
        if (nestedDoc) {
          const speciesId =
            typeof nestedDoc.data().speciesId === "string"
              ? (nestedDoc.data().speciesId as string)
              : nestedDoc.id;
          return ensureCanonicalLearningItemDocument(speciesId);
        }
      } catch {
        // Some deployments still restrict collectionGroup("species") reads
        // against legacy nested content. Falling back to canonical-only lookup
        // keeps direct Pinkka imports working and lets the system create the
        // canonical learning-item document instead of failing the whole import.
      }
    }
  }

  return null;
}

async function findCanonicalGroupByPinkkaGroupId(
  pinkkaGroupId: number,
): Promise<Group | null> {
  const snapshot = await getDocs(
    query(
      collection(db, "groups"),
      where("pinkkaRef.groupId", "==", pinkkaGroupId),
      limit(1),
    ),
  );
  const groupDoc = snapshot.docs[0];
  return groupDoc ? toGroupFromDoc(groupDoc) : null;
}

async function findCanonicalStackByPinkkaRef(params: {
  groupId: string;
  pinkkaGroupId: number;
  pinkkaStackId: number;
}): Promise<Stack | null> {
  const stacksSnapshot = await getDocs(
    query(
      collection(db, "groups", params.groupId, "stacks"),
      where("pinkkaRef.groupId", "==", params.pinkkaGroupId),
      where("pinkkaRef.stackId", "==", params.pinkkaStackId),
      limit(1),
    ),
  );
  const stackDoc = stacksSnapshot.docs[0];
  return stackDoc ? toStackFromDoc(stackDoc) : null;
}

async function buildCanonicalLearningItemUpsertOperation(params: {
  existingSpecies?: Species | null;
  ownerId: string;
  sourceRecord: ContentSourceRecord<SpeciesData>;
  pinkkaRef?: Species["pinkkaRef"];
  testImageIds?: string[];
  isHidden?: boolean;
  importId?: string;
  now: Timestamp;
}): Promise<{
  speciesId: string;
  operation?: BatchSetOperation;
  created: boolean;
}> {
  const existingSpecies =
    params.existingSpecies ??
    (await findCanonicalLearningItemBySourceRecord(params.sourceRecord));
  const speciesId = existingSpecies?.id ?? buildCanonicalId();
  const sourceRecords = upsertContentSourceRecord(
    existingSpecies?.sourceRecords,
    params.sourceRecord,
  );
  const manualOverrides = getEntityManualOverrides(
    existingSpecies ?? undefined,
    params.sourceRecord.data,
  );
  const data = mergeSourceContentData(
    params.sourceRecord.data,
    manualOverrides,
  );
  const nextDocumentData = {
    learningItemId: speciesId,
    speciesId,
    data,
    sourceRecords,
    ...(getContentSourceKeys(sourceRecords)
      ? { sourceKeys: getContentSourceKeys(sourceRecords) }
      : {}),
    ...(manualOverrides ? { manualOverrides } : {}),
    ...(params.pinkkaRef ? { pinkkaRef: params.pinkkaRef } : {}),
    ...(params.testImageIds ? { testImageIds: params.testImageIds } : {}),
    ...(typeof params.isHidden === "boolean"
      ? { isHidden: params.isHidden }
      : {}),
    ...(params.importId ? { importId: params.importId } : {}),
    ownerId: existingSpecies?.ownerId ?? params.ownerId,
    createdAt:
      existingSpecies?.createdAt instanceof Date
        ? Timestamp.fromDate(existingSpecies.createdAt)
        : params.now,
    updatedAt: params.now,
  };

  const previousComparableData = existingSpecies
    ? {
        data: existingSpecies.data,
        sourceRecords: existingSpecies.sourceRecords,
        sourceKeys: existingSpecies.sourceKeys,
        manualOverrides: existingSpecies.manualOverrides,
        pinkkaRef: existingSpecies.pinkkaRef,
        testImageIds: existingSpecies.testImageIds,
        isHidden: existingSpecies.isHidden,
        importId: existingSpecies.importId,
        ownerId: existingSpecies.ownerId,
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
    importId: nextDocumentData.importId,
    ownerId: nextDocumentData.ownerId,
  };

  return {
    speciesId,
    ...(previousComparableData &&
    areSyncComparableValuesEqual(previousComparableData, nextComparableData)
      ? {}
      : {
          operation: {
            ref: getCanonicalLearningItemRef(speciesId),
            data: nextDocumentData,
          },
        }),
    created: existingSpecies === null || existingSpecies === undefined,
  };
}

async function buildCanonicalPinkkaGroupUpsertOperation(params: {
  pinkkaGroup: PinkkaGroup;
  ownerId: string;
  order: number;
  existingGroup?: Group | null;
  now: Timestamp;
}): Promise<{
  groupId: string;
  operation?: BatchSetOperation;
  created: boolean;
}> {
  const existingGroup =
    params.existingGroup ??
    (await findCanonicalGroupByPinkkaGroupId(params.pinkkaGroup.id));
  const groupId = existingGroup?.id ?? buildCanonicalId();
  const groupImages = await mapPinkkaImageAssetsToEntityImages({
    assets: getPinkkaGroupImageAssets(params.pinkkaGroup),
    fallbackIdPrefix: `group-${params.pinkkaGroup.id}`,
    resolveStoredUrls: false,
  });
  const sourceData: GroupData = {
    name: params.pinkkaGroup.name,
    ...(params.pinkkaGroup.description
      ? { description: params.pinkkaGroup.description }
      : {}),
  };
  const sourceRecords = upsertContentSourceRecord(
    existingGroup?.sourceRecords,
    buildPinkkaSourceRecord<GroupData>({
      entityType: "group",
      externalId: params.pinkkaGroup.id,
      data: sourceData,
    }),
  );
  const manualOverrides = getEntityManualOverrides(
    existingGroup ?? undefined,
    sourceData,
  );
  const mergedData = mergeSourceContentData(sourceData, manualOverrides);
  const nextDocumentData = {
    data: mergedData,
    sourceRecords,
    ...(getContentSourceKeys(sourceRecords)
      ? { sourceKeys: getContentSourceKeys(sourceRecords) }
      : {}),
    ...(manualOverrides ? { manualOverrides } : {}),
    pinkkaRef: {
      groupId: params.pinkkaGroup.id,
    },
    images: groupImages,
    ownerId: existingGroup?.ownerId ?? params.ownerId,
    order: existingGroup?.order ?? params.order,
    isHidden: existingGroup?.isHidden ?? false,
    createdAt:
      existingGroup?.createdAt instanceof Date
        ? Timestamp.fromDate(existingGroup.createdAt)
        : params.now,
    updatedAt: params.now,
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
    ...(previousComparableData &&
    areSyncComparableValuesEqual(previousComparableData, nextComparableData)
      ? {}
      : {
          operation: {
            ref: doc(db, "groups", groupId),
            data: nextDocumentData,
          },
        }),
    created: existingGroup === null || existingGroup === undefined,
  };
}

async function buildCanonicalPinkkaStackUpsertOperation(params: {
  canonicalGroupId: string;
  pinkkaGroupId: number;
  pinkkaStack: PinkkaSubStack;
  ownerId: string;
  order: number;
  speciesIds: string[];
  existingStack?: Stack | null;
  now: Timestamp;
}): Promise<{
  stackId: string;
  operation?: BatchSetOperation;
  created: boolean;
}> {
  const stackId = params.existingStack?.id ?? buildCanonicalId();
  const stackImages = await mapPinkkaImageAssetsToEntityImages({
    assets: getPinkkaStackImageAssets(params.pinkkaStack),
    fallbackIdPrefix:
      params.pinkkaStack.imageId || `stack-${params.pinkkaStack.id}`,
    resolveStoredUrls: false,
  });
  const sourceData: StackData = {
    name: params.pinkkaStack.name,
    ...(params.pinkkaStack.description
      ? { description: params.pinkkaStack.description }
      : {}),
    images: stackImages,
  };
  const sourceRecords = upsertContentSourceRecord(
    params.existingStack?.sourceRecords,
    buildPinkkaSourceRecord<StackData>({
      entityType: "stack",
      externalId: params.pinkkaStack.id,
      data: sourceData,
      metadata: {
        groupId: params.pinkkaGroupId,
      },
    }),
  );
  const manualOverrides = getEntityManualOverrides(
    params.existingStack ?? undefined,
    sourceData,
  );
  const mergedData = mergeSourceContentData(sourceData, manualOverrides);
  const nextLinkedLearningItemIds = dedupeIds(params.speciesIds);
  const nextDocumentData = {
    stackId,
    parentGroupId: params.canonicalGroupId,
    data: mergedData,
    sourceRecords,
    ...(getContentSourceKeys(sourceRecords)
      ? { sourceKeys: getContentSourceKeys(sourceRecords) }
      : {}),
    ...(manualOverrides ? { manualOverrides } : {}),
    pinkkaRef: {
      groupId: params.pinkkaGroupId,
      stackId: params.pinkkaStack.id,
    },
    images: stackImages,
    learningItemIds: nextLinkedLearningItemIds,
    speciesIds: nextLinkedLearningItemIds,
    ownerId: params.existingStack?.ownerId ?? params.ownerId,
    order: params.existingStack?.order ?? params.order,
    isHidden: params.existingStack?.isHidden ?? false,
    createdAt:
      params.existingStack?.createdAt instanceof Date
        ? Timestamp.fromDate(params.existingStack.createdAt)
        : params.now,
    updatedAt: params.now,
  };
  const previousComparableData = params.existingStack
    ? {
        parentGroupId: params.existingStack.parentGroupId,
        data: params.existingStack.data,
        sourceRecords: params.existingStack.sourceRecords,
        sourceKeys: params.existingStack.sourceKeys,
        manualOverrides: params.existingStack.manualOverrides,
        pinkkaRef: params.existingStack.pinkkaRef,
        images: params.existingStack.images,
        learningItemIds: getStackLinkedLearningItemIds(params.existingStack),
        speciesIds: params.existingStack.speciesIds,
        ownerId: params.existingStack.ownerId,
        order: params.existingStack.order,
        isHidden: params.existingStack.isHidden,
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
    ...(previousComparableData &&
    areSyncComparableValuesEqual(previousComparableData, nextComparableData)
      ? {}
      : {
          operation: {
            ref: doc(db, "groups", params.canonicalGroupId, "stacks", stackId),
            data: nextDocumentData,
          },
        }),
    created:
      params.existingStack === null || params.existingStack === undefined,
  };
}

type ResolvedStackLocation = {
  groupId: string;
  stackId: string;
  doc: FirestoreDocLike & { ref: ReturnType<typeof doc> };
};

type ResolvedSpeciesLocation = {
  groupId: string;
  stackId: string;
  speciesId: string;
  doc: FirestoreDocLike & { ref: ReturnType<typeof doc> };
};

async function resolveNestedStackLocation(
  stackId: string,
): Promise<ResolvedStackLocation | null> {
  const cachedLocation = nestedStackLocationCache.get(stackId);
  if (cachedLocation) {
    const nestedStackDoc = await getDoc(
      doc(db, "groups", cachedLocation.groupId, "stacks", stackId),
    );
    if (nestedStackDoc.exists()) {
      return {
        groupId: cachedLocation.groupId,
        stackId: nestedStackDoc.id,
        doc: nestedStackDoc as FirestoreDocLike & {
          ref: ReturnType<typeof doc>;
        },
      };
    }
    nestedStackLocationCache.delete(stackId);
  }

  try {
    const snapshot = await getDocs(
      query(
        collectionGroup(db, "stacks"),
        where("stackId", "==", stackId),
        limit(1),
      ),
    );
    const stackDoc = snapshot.docs[0];
    if (stackDoc) {
      const groupId = stackDoc.ref.parent.parent?.id;
      if (groupId) {
        nestedStackLocationCache.set(stackId, { groupId });
        return {
          groupId,
          stackId: stackDoc.id,
          doc: stackDoc as FirestoreDocLike & { ref: ReturnType<typeof doc> },
        };
      }
    }
  } catch {
    // Fall through to parent-path scan when collectionGroup is restricted.
  }

  const groupsSnapshot = await getDocs(collection(db, "groups"));
  for (const groupDoc of groupsSnapshot.docs) {
    const nestedStackDoc = await getDoc(
      doc(db, "groups", groupDoc.id, "stacks", stackId),
    );
    if (!nestedStackDoc.exists()) {
      continue;
    }
    nestedStackLocationCache.set(stackId, { groupId: groupDoc.id });
    return {
      groupId: groupDoc.id,
      stackId: nestedStackDoc.id,
      doc: nestedStackDoc as FirestoreDocLike & { ref: ReturnType<typeof doc> },
    };
  }

  return null;
}

async function resolveNestedSpeciesLocation(
  speciesId: string,
): Promise<ResolvedSpeciesLocation | null> {
  const cachedLocation = nestedSpeciesLocationCache.get(speciesId);
  if (cachedLocation) {
    const nestedSpeciesDoc = await getDoc(
      doc(
        db,
        "groups",
        cachedLocation.groupId,
        "stacks",
        cachedLocation.stackId,
        "species",
        speciesId,
      ),
    );
    if (nestedSpeciesDoc.exists()) {
      return {
        groupId: cachedLocation.groupId,
        stackId: cachedLocation.stackId,
        speciesId: nestedSpeciesDoc.id,
        doc: nestedSpeciesDoc as FirestoreDocLike & {
          ref: ReturnType<typeof doc>;
        },
      };
    }
    nestedSpeciesLocationCache.delete(speciesId);
  }

  try {
    const snapshot = await getDocs(
      query(
        collectionGroup(db, "species"),
        where("speciesId", "==", speciesId),
        limit(1),
      ),
    );
    const speciesDoc = snapshot.docs[0];
    if (speciesDoc) {
      const stackId = speciesDoc.ref.parent.parent?.id;
      const groupId = speciesDoc.ref.parent.parent?.parent?.parent?.id;
      if (stackId && groupId) {
        nestedSpeciesLocationCache.set(speciesId, { groupId, stackId });
        return {
          groupId,
          stackId,
          speciesId: speciesDoc.id,
          doc: speciesDoc as FirestoreDocLike & { ref: ReturnType<typeof doc> },
        };
      }
    }
  } catch {
    // Fall through to parent-path scan when collectionGroup is restricted.
  }

  const groupsSnapshot = await getDocs(collection(db, "groups"));
  for (const groupDoc of groupsSnapshot.docs) {
    const stacksSnapshot = await getDocs(
      collection(db, "groups", groupDoc.id, "stacks"),
    );
    for (const stackDoc of stacksSnapshot.docs) {
      const nestedSpeciesDoc = await getDoc(
        doc(
          db,
          "groups",
          groupDoc.id,
          "stacks",
          stackDoc.id,
          "species",
          speciesId,
        ),
      );
      if (!nestedSpeciesDoc.exists()) {
        continue;
      }
      nestedSpeciesLocationCache.set(speciesId, {
        groupId: groupDoc.id,
        stackId: stackDoc.id,
      });
      return {
        groupId: groupDoc.id,
        stackId: stackDoc.id,
        speciesId: nestedSpeciesDoc.id,
        doc: nestedSpeciesDoc as FirestoreDocLike & {
          ref: ReturnType<typeof doc>;
        },
      };
    }
  }

  return null;
}

// Group operations
/** Create a new group and return its id. */
export async function createGroup(
  group: Omit<Group, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const groupId = buildCanonicalId();
  const groupRef = doc(db, "groups", groupId);
  const now = Timestamp.now();
  const newGroup = {
    ...group,
    isHidden: group.isHidden ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(groupRef, newGroup);
  return groupId;
}

/** Fetch groups, optionally filtered by owner and visibility. */
export async function getGroups(
  ownerId?: string,
  options?: { includeHidden?: boolean },
): Promise<Group[]> {
  const includeHidden = options?.includeHidden ?? false;
  const groupsQuery = ownerId
    ? query(collection(db, "groups"), where("ownerId", "==", ownerId))
    : query(collection(db, "groups"));
  const snapshot = await getDocs(groupsQuery);
  const groups = sortByOrder(
    snapshot.docs.map((docSnapshot) => toGroupFromDoc(docSnapshot)),
  );
  return includeHidden ? groups : groups.filter((group) => !group.isHidden);
}

/** Fetch a single group by id. */
export async function getGroup(groupId: string): Promise<Group | null> {
  const groupDoc = await getDoc(doc(db, "groups", groupId));
  if (!groupDoc.exists()) return null;
  return toGroupFromDoc(groupDoc);
}

/** Update a group with partial fields. */
export async function updateGroup(
  groupId: string,
  updates: Partial<Group>,
): Promise<void> {
  const group = await getGroup(groupId);
  if (!group) {
    throw new Error(`Group ${groupId} was not found.`);
  }

  const nextData = updates.data;
  const hasSourceRecords =
    (group.sourceRecords?.length ?? 0) > 0 ||
    (updates.sourceRecords?.length ?? 0) > 0;
  const nextManualOverrides =
    nextData && hasSourceRecords
      ? deriveManualOverrides(
          (group.sourceRecords?.[group.sourceRecords.length - 1]?.data ??
            group.data) as GroupData,
          nextData,
        )
      : updates.manualOverrides;

  await updateDoc(doc(db, "groups", groupId), {
    ...updates,
    ...(nextData ? { data: nextData } : {}),
    ...(nextManualOverrides ? { manualOverrides: nextManualOverrides } : {}),
    updatedAt: Timestamp.now(),
  });
}

/** Delete a group and its descendant stacks/species. */
export async function deleteGroup(groupId: string): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) {
    return;
  }

  const groupData = groupDoc.data();
  const nestedStacksSnapshot = await getDocs(
    collection(db, "groups", groupId, "stacks"),
  );
  for (const stackDoc of nestedStacksSnapshot.docs) {
    await deleteStack(stackDoc.id, { groupId });
  }

  const legacyStackIds = (groupData.stackIds ?? []) as string[];
  for (const legacyStackId of legacyStackIds) {
    await deleteStack(legacyStackId);
  }

  await deleteDoc(groupRef);
}

// Stack operations
/** Create a stack and link it to a parent group. */
export async function createStack(
  stack: Omit<Stack, "id" | "createdAt" | "updatedAt">,
  groupIds: string[] = [],
): Promise<string> {
  const parentGroupId = stack.parentGroupId ?? groupIds[0];
  if (!parentGroupId) {
    throw new Error("A parent group id is required when creating a stack.");
  }

  const siblingStacks = await getStacks(parentGroupId, undefined, {
    includeHidden: true,
  });
  const stackId = buildCanonicalId();
  const stackRef = doc(db, "groups", parentGroupId, "stacks", stackId);
  const now = Timestamp.now();
  const newStack = {
    ...stack,
    stackId,
    parentGroupId,
    order: stack.order ?? siblingStacks.length,
    isHidden: stack.isHidden ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(stackRef, newStack);
  return stackId;
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

    const nestedQuery = ownerId
      ? query(
          collection(db, "groups", groupId, "stacks"),
          where("ownerId", "==", ownerId),
        )
      : query(collection(db, "groups", groupId, "stacks"));
    const nestedSnapshot = await getDocs(nestedQuery);
    let stacks = sortByOrder(
      nestedSnapshot.docs.map((docSnapshot) => toStackFromDoc(docSnapshot)),
    );

    // Legacy fallback for historical docs linked only with group.stackIds.
    if (stacks.length === 0) {
      const legacyStackIds = (groupDoc.data().stackIds ?? []) as string[];
      if (legacyStackIds.length > 0) {
        const stackDocs = await Promise.all(
          legacyStackIds.map((id) => getDoc(doc(db, "stacks", id))),
        );
        stacks = sortByOrder(
          stackDocs
            .filter((stackDoc) => stackDoc.exists())
            .map((stackDoc) => toStackFromDoc(stackDoc))
            .filter((stackItem) =>
              ownerId ? stackItem.ownerId === ownerId : true,
            ),
        );
      }
    }

    return includeHidden ? stacks : stacks.filter((stack) => !stack.isHidden);
  }

  const groups = await getGroups(ownerId, { includeHidden: true });
  const groupsById = new Map(groups.map((group) => [group.id, group] as const));
  const mergedById = new Map<string, Stack>();

  const addStack = (stack: Stack, options?: { parentGroupId?: string }) => {
    const resolvedParentGroupId = stack.parentGroupId ?? options?.parentGroupId;
    const resolvedStack = resolvedParentGroupId
      ? { ...stack, parentGroupId: resolvedParentGroupId }
      : stack;

    if (!includeHidden && resolvedStack.isHidden) {
      return;
    }

    if (options?.parentGroupId) {
      const parentGroup = groupsById.get(options.parentGroupId);
      if (!parentGroup) {
        return;
      }
      if (!includeHidden && parentGroup.isHidden) {
        return;
      }
    }

    mergedById.set(resolvedStack.id, resolvedStack);
  };

  try {
    const nestedQuery = ownerId
      ? query(collectionGroup(db, "stacks"), where("ownerId", "==", ownerId))
      : query(collectionGroup(db, "stacks"));
    const nestedSnapshot = await getDocs(nestedQuery);

    for (const docSnapshot of nestedSnapshot.docs) {
      const parentGroupId = docSnapshot.ref.parent.parent?.id;
      if (!parentGroupId) {
        continue;
      }

      addStack(toStackFromDoc(docSnapshot), { parentGroupId });
    }
  } catch (error) {
    console.error("Failed to fetch nested stacks via collection group", error);

    const groupStackResults = await Promise.allSettled(
      groups.map((group) =>
        getStacks(group.id, ownerId, {
          includeHidden: true,
        }),
      ),
    );
    groupStackResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        for (const stack of result.value) {
          addStack(stack, { parentGroupId: groups[index]?.id });
        }
        return;
      }

      console.error(
        `Failed to fetch stacks for group ${groups[index]?.id ?? "unknown"}`,
        result.reason,
      );
    });
  }

  const legacyQuery = ownerId
    ? query(collection(db, "stacks"), where("ownerId", "==", ownerId))
    : query(collection(db, "stacks"));
  const legacySnapshot = await getDocs(legacyQuery);
  for (const docSnapshot of legacySnapshot.docs) {
    if (!mergedById.has(docSnapshot.id)) {
      addStack(toStackFromDoc(docSnapshot));
    }
  }

  const stacks = sortByOrder([...mergedById.values()]);
  return includeHidden ? stacks : stacks.filter((stack) => !stack.isHidden);
}

/**
 * Fetch stacks for a known set of parent groups with chunked `in` queries.
 *
 * This avoids the N+1 pattern of loading each group's nested stacks
 * individually while still limiting payload size by only requesting the
 * groups currently shown in management UI.
 */
export async function getStacksByParentGroupIds(
  groupIds: string[],
  ownerId?: string,
  options?: {
    includeHidden?: boolean;
    legacyStackIdsByGroupId?: Record<string, string[]>;
  },
): Promise<Record<string, Stack[]>> {
  const includeHidden = options?.includeHidden ?? false;
  const uniqueGroupIds = dedupeIds(groupIds);
  const uniqueGroupIdSet = new Set(uniqueGroupIds);
  const legacyStackIdsByGroupId = options?.legacyStackIdsByGroupId ?? {};
  const stacksByGroupId = uniqueGroupIds.reduce<Record<string, Stack[]>>(
    (accumulator, groupId) => {
      accumulator[groupId] = [];
      return accumulator;
    },
    {},
  );
  const stackMapsByGroupId = uniqueGroupIds.reduce<
    Record<string, Map<string, Stack>>
  >((accumulator, groupId) => {
    accumulator[groupId] = new Map<string, Stack>();
    return accumulator;
  }, {});

  if (uniqueGroupIds.length === 0) {
    return stacksByGroupId;
  }

  const pushStacks = (stacks: Stack[]) => {
    for (const stack of stacks) {
      const parentGroupId = stack.parentGroupId;
      if (!parentGroupId || !uniqueGroupIdSet.has(parentGroupId)) {
        continue;
      }
      if (!includeHidden && stack.isHidden) {
        continue;
      }
      stackMapsByGroupId[parentGroupId]?.set(stack.id, stack);
    }
  };

  const pushLegacyStackForGroup = (groupId: string, stack: Stack) => {
    if (!uniqueGroupIdSet.has(groupId)) {
      return;
    }
    if (!includeHidden && stack.isHidden) {
      return;
    }
    stackMapsByGroupId[groupId]?.set(stack.id, {
      ...stack,
      parentGroupId: stack.parentGroupId ?? groupId,
    });
  };

  for (const chunk of chunkArray(uniqueGroupIds, FIRESTORE_IN_QUERY_MAX)) {
    const nestedQuery = ownerId
      ? query(
          collectionGroup(db, "stacks"),
          where("ownerId", "==", ownerId),
          where("parentGroupId", "in", chunk),
        )
      : query(
          collectionGroup(db, "stacks"),
          where("parentGroupId", "in", chunk),
        );
    const legacyQuery = ownerId
      ? query(
          collection(db, "stacks"),
          where("ownerId", "==", ownerId),
          where("parentGroupId", "in", chunk),
        )
      : query(collection(db, "stacks"), where("parentGroupId", "in", chunk));

    const [nestedSnapshot, legacySnapshot] = await Promise.all([
      getDocs(nestedQuery),
      getDocs(legacyQuery),
    ]);
    pushStacks(
      nestedSnapshot.docs.map((docSnapshot) => toStackFromDoc(docSnapshot)),
    );
    pushStacks(
      legacySnapshot.docs.map((docSnapshot) => toStackFromDoc(docSnapshot)),
    );
  }

  const legacyReferencedGroupIds = uniqueGroupIds.filter((groupId) => {
    return (legacyStackIdsByGroupId[groupId]?.length ?? 0) > 0;
  });
  const groupIdsByLegacyStackId = new Map<string, string[]>();

  legacyReferencedGroupIds.forEach((groupId) => {
    dedupeIds(legacyStackIdsByGroupId[groupId] ?? []).forEach((stackId) => {
      const currentGroupIds = groupIdsByLegacyStackId.get(stackId) ?? [];
      groupIdsByLegacyStackId.set(stackId, [...currentGroupIds, groupId]);
    });
  });

  const legacyReferencedStackIds = [...groupIdsByLegacyStackId.keys()];
  for (const chunk of chunkArray(
    legacyReferencedStackIds,
    FIRESTORE_IN_QUERY_MAX,
  )) {
    const legacySnapshot = await getDocs(
      query(collection(db, "stacks"), where(documentId(), "in", chunk)),
    );

    legacySnapshot.docs.forEach((docSnapshot) => {
      const stack = toStackFromDoc(docSnapshot);
      if (ownerId && stack.ownerId !== ownerId) {
        return;
      }

      (groupIdsByLegacyStackId.get(docSnapshot.id) ?? []).forEach((groupId) => {
        pushLegacyStackForGroup(groupId, stack);
      });
    });
  }

  for (const groupId of uniqueGroupIds) {
    stacksByGroupId[groupId] = sortByOrder([
      ...(stackMapsByGroupId[groupId]?.values() ?? []),
    ]);
  }

  return stacksByGroupId;
}

/** Fetch a single stack by id, respecting visibility by default. */
export async function getStack(
  stackId: string,
  options?: { includeHidden?: boolean },
): Promise<Stack | null> {
  const includeHidden = options?.includeHidden ?? false;
  const nestedLocation = await resolveNestedStackLocation(stackId);
  let stack: Stack | null = null;

  if (nestedLocation) {
    stack = toStackFromDoc(nestedLocation.doc);
  } else {
    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (!stackDoc.exists()) return null;
    stack = toStackFromDoc(stackDoc);
  }

  if (!stack) {
    return null;
  }
  if (!includeHidden && stack.isHidden) return null;
  return stack;
}

/** Update a stack with partial fields. */
export async function updateStack(
  stackId: string,
  updates: Partial<Stack>,
): Promise<void> {
  const stack = await getStack(stackId, { includeHidden: true });
  if (!stack) {
    throw new Error(`Stack ${stackId} was not found.`);
  }

  const nestedLocation = await resolveNestedStackLocation(stackId);
  const targetRef = nestedLocation
    ? doc(db, "groups", nestedLocation.groupId, "stacks", stackId)
    : doc(db, "stacks", stackId);
  const nextData = updates.data;
  const hasSourceRecords =
    (stack.sourceRecords?.length ?? 0) > 0 ||
    (updates.sourceRecords?.length ?? 0) > 0;
  const nextManualOverrides =
    nextData && hasSourceRecords
      ? deriveManualOverrides(
          (stack.sourceRecords?.[stack.sourceRecords.length - 1]?.data ??
            stack.data) as StackData,
          nextData,
        )
      : updates.manualOverrides;
  await updateDoc(targetRef, {
    ...updates,
    ...(nextData ? { data: nextData } : {}),
    ...(nextManualOverrides ? { manualOverrides: nextManualOverrides } : {}),
    updatedAt: Timestamp.now(),
  });
}

/** Delete a stack document and all descendant species. */
export async function deleteStack(
  stackId: string,
  options?: { groupId?: string },
): Promise<void> {
  let nestedLocation: ResolvedStackLocation | null = null;
  if (options?.groupId) {
    const nestedStackDoc = await getDoc(
      doc(db, "groups", options.groupId, "stacks", stackId),
    );
    if (nestedStackDoc.exists()) {
      nestedLocation = {
        groupId: options.groupId,
        stackId: nestedStackDoc.id,
        doc: nestedStackDoc as FirestoreDocLike & {
          ref: ReturnType<typeof doc>;
        },
      };
    }
  }

  if (!nestedLocation) {
    nestedLocation = await resolveNestedStackLocation(stackId);
  }

  if (nestedLocation) {
    const speciesSnapshot = await getDocs(
      collection(
        db,
        "groups",
        nestedLocation.groupId,
        "stacks",
        stackId,
        "species",
      ),
    );
    await commitDeleteReferencesInBatches(
      speciesSnapshot.docs.map((speciesDoc) => speciesDoc.ref),
    );
    await deleteDoc(
      doc(db, "groups", nestedLocation.groupId, "stacks", stackId),
    );
  }

  // Legacy unlink for historical groups still using stackIds arrays.
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

  const legacyStackDoc = await getDoc(doc(db, "stacks", stackId));
  if (legacyStackDoc.exists()) {
    await deleteDoc(doc(db, "stacks", stackId));
  }
}

/** Update stack ordering under a group. */
export async function updateGroupStackOrder(
  groupId: string,
  stackIds: string[],
): Promise<void> {
  const batch = writeBatch(db);
  for (let index = 0; index < stackIds.length; index += 1) {
    const stackId = stackIds[index];
    const nestedLocation = await resolveNestedStackLocation(stackId);
    const targetRef = nestedLocation
      ? doc(db, "groups", nestedLocation.groupId, "stacks", stackId)
      : doc(db, "stacks", stackId);
    batch.update(targetRef, {
      stackId,
      parentGroupId: groupId,
      order: index,
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();

  const groupDoc = await getDoc(doc(db, "groups", groupId));
  if (groupDoc.exists()) {
    await updateDoc(doc(db, "groups", groupId), {
      stackIds,
      updatedAt: Timestamp.now(),
    });
  }
}

/** Fetch import status for a Pinkka group id. */
export async function getPinkkaGroupImportStatus(
  groupId: number,
): Promise<PinkkaImportStatus> {
  const cached = pinkkaGroupImportStatusCache.get(groupId);
  if (cached !== undefined) {
    return cached;
  }

  return await new Promise((resolve) => {
    const existingResolvers =
      pendingPinkkaGroupStatusResolvers.get(groupId) ?? [];
    pendingPinkkaGroupStatusResolvers.set(groupId, [
      ...existingResolvers,
      resolve,
    ]);

    if (pendingPinkkaGroupStatusFlush !== undefined) {
      return;
    }

    pendingPinkkaGroupStatusFlush = setTimeout(async () => {
      pendingPinkkaGroupStatusFlush = undefined;
      const entries = [...pendingPinkkaGroupStatusResolvers.entries()];
      pendingPinkkaGroupStatusResolvers.clear();
      const ids = entries.map(([id]) => id);
      const statuses = await getPinkkaGroupImportStateMap(ids);

      for (const [id, resolvers] of entries) {
        const value = statuses[id] ?? NOT_IMPORTED_STATUS;
        resolvers.forEach((resolver) => resolver(value));
      }
    }, 0);
  });
}

/** Check if a Pinkka group id already exists in Firestore. */
export async function isPinkkaGroupImported(groupId: number): Promise<boolean> {
  const status = await getPinkkaGroupImportStatus(groupId);
  return status.isImported;
}

/** Fetch import status for a Pinkka stack id. */
export async function getPinkkaStackImportStatus(
  stackId: number,
  options?: { groupId?: number },
): Promise<PinkkaImportStatus> {
  const cached = pinkkaStackImportStatusCache.get(stackId);
  if (cached !== undefined) {
    return cached;
  }

  if (options?.groupId === undefined) {
    return NOT_IMPORTED_STATUS;
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

      const statusesByGroup = new Map<
        number,
        Record<number, PinkkaImportStatus>
      >();
      await Promise.all(
        [...idsByGroup.entries()].map(async ([groupId, stackIds]) => {
          const statuses = await getPinkkaStackImportStateMap(
            groupId,
            stackIds,
          );
          statusesByGroup.set(groupId, statuses);
        }),
      );

      for (const entry of entries) {
        const groupStatuses = statusesByGroup.get(entry.groupId);
        const value = groupStatuses?.[entry.stackId] ?? NOT_IMPORTED_STATUS;
        entry.resolvers.forEach((resolver) => resolver(value));
      }
    }, 0);
  });
}

/** Check if a Pinkka stack id already exists in Firestore. */
export async function isPinkkaStackImported(
  stackId: number,
  options?: { groupId?: number },
): Promise<boolean> {
  const status = await getPinkkaStackImportStatus(stackId, options);
  return status.isImported;
}

/** Fetch import status for a Pinkka species id. */
export async function getPinkkaSpeciesImportStatus(
  speciesId: number,
  options?: { groupId?: number; stackId?: number },
): Promise<PinkkaImportStatus> {
  const cached = pinkkaSpeciesImportStatusCache.get(speciesId);
  if (cached !== undefined) {
    return cached;
  }

  if (options?.groupId === undefined || options?.stackId === undefined) {
    return NOT_IMPORTED_STATUS;
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

      const idsByParent = new Map<
        string,
        { groupId: number; stackId: number; speciesIds: number[] }
      >();
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

      const statusesByParent = new Map<
        string,
        Record<number, PinkkaImportStatus>
      >();
      await Promise.all(
        [...idsByParent.entries()].map(async ([parentKey, value]) => {
          const statuses = await getPinkkaSpeciesImportStateMap(
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
        const value = parentStatuses?.[entry.speciesId] ?? NOT_IMPORTED_STATUS;
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
  const status = await getPinkkaSpeciesImportStatus(speciesId, options);
  return status.isImported;
}

// Pinkka import operations
/**
 * Import a Pinkka group directly into canonical app content.
 */
export async function importPinkkaGroup(
  groupId: number,
  ownerId: string,
  options?: {
    importId?: string;
    upsert?: boolean;
    progressContext?: PinkkaImportProgressContext;
    force?: boolean;
  },
): Promise<PinkkaImportResult | null> {
  void options?.upsert;
  assertPinkkaImportNotInterrupted(options?.progressContext);
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  updateCurrentEntityProgress(
    options?.progressContext,
    "groups",
    `Group ${groupId}`,
  );
  const group = await fetchPinkkaGroupWithStacks(groupId);
  if (!group) return null;
  const groupName = getPinkkaGroupDisplayName(group);
  updateCurrentEntityProgress(options?.progressContext, "groups", groupName);
  const existingGroup = await findCanonicalGroupByPinkkaGroupId(groupId);
  if (existingGroup) {
    const existingGroupImportStatus = await getPinkkaGroupImportStatus(groupId);
    await refreshEditableGroupFromPinkka({
      groupId: existingGroup.id,
      ownerId,
      onProgress: options?.progressContext?.onProgress,
      progressContext: options?.progressContext,
      shouldInterrupt: options?.progressContext?.shouldInterrupt,
      includeSpeciesImages: true,
      syncPinkkaStatusMarkers:
        !existingGroupImportStatus.isImported ||
        existingGroupImportStatus.isIncomplete,
    });
    markGroupCompleted(options?.progressContext, group.id, groupName);
    return {
      importId: resolvedImportId,
      groupId: existingGroup.id,
      stackIds: [],
      learningItemIds: [],
      speciesIds: [],
    };
  }

  const existingGroups = await getGroups(ownerId, { includeHidden: true });
  extendPinkkaImportProgressTotals(options?.progressContext, {
    stacks: group.subPinkkas?.length ?? 0,
  });
  const creationResult = await createEditableGroupFromImportedPinkka({
    sourceGroup: {
      groupId,
      entity: group,
      stackCount: group.subPinkkas?.length ?? 0,
      isIncomplete: false,
    },
    ownerId,
    order: existingGroups.length,
    includeImages: true,
    progressContext: options?.progressContext,
    shouldInterrupt: options?.progressContext?.shouldInterrupt,
  });
  await markPinkkaGroupImportCompletedDirect(groupId);
  markGroupCompleted(options?.progressContext, group.id, groupName);
  return {
    importId: resolvedImportId,
    groupId: creationResult.groupId,
    stackIds: [],
    learningItemIds: [],
    speciesIds: [],
  };
}

/**
 * Import a Pinkka stack directly into canonical app content.
 */
export async function importPinkkaStack(
  stackId: number,
  ownerId: string,
  options?: {
    importId?: string;
    upsert?: boolean;
    groupId?: number;
    progressContext?: PinkkaImportProgressContext;
    force?: boolean;
  },
): Promise<PinkkaImportResult | null> {
  void options?.upsert;
  assertPinkkaImportNotInterrupted(options?.progressContext);
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  if (options?.groupId !== undefined) {
    updateCurrentEntityProgress(
      options.progressContext,
      "groups",
      `Group ${options.groupId}`,
    );
  }
  updateCurrentEntityProgress(
    options?.progressContext,
    "stacks",
    `Stack ${stackId}`,
  );
  const stackDetail = await fetchPinkkaSubStack(stackId);
  if (!stackDetail) return null;
  const resolvedGroupId =
    options?.groupId ?? (await resolveGroupIdForStack(stackId, stackDetail));
  if (resolvedGroupId === null) return null;
  const groupDetail = await fetchPinkkaGroupWithStacks(resolvedGroupId);
  if (!groupDetail) return null;
  const now = Timestamp.now();
  const groupName = getPinkkaGroupDisplayName(groupDetail);
  const stackName = getPinkkaStackDisplayName(stackDetail);
  updateCurrentEntityProgress(options?.progressContext, "groups", groupName);
  updateCurrentEntityProgress(options?.progressContext, "stacks", stackName);
  const existingGroup =
    await findCanonicalGroupByPinkkaGroupId(resolvedGroupId);
  const groupUpsert = await buildCanonicalPinkkaGroupUpsertOperation({
    pinkkaGroup: groupDetail,
    ownerId,
    order:
      existingGroup?.order ??
      (await getGroups(ownerId, { includeHidden: true })).length,
    existingGroup,
    now,
  });
  const canonicalGroupId = groupUpsert.groupId;
  const existingStack = existingGroup
    ? await findCanonicalStackByPinkkaRef({
        groupId: canonicalGroupId,
        pinkkaGroupId: resolvedGroupId,
        pinkkaStackId: stackId,
      })
    : null;
  const stackRefreshResult = await buildEditableStackRefreshOperations({
    groupId: canonicalGroupId,
    ownerId,
    pinkkaGroupId: resolvedGroupId,
    sourceStack: stackDetail,
    importedSpecies: await getImportedPinkkaSpeciesEntries(
      resolvedGroupId,
      stackId,
    ),
    order: existingStack?.order ?? stackDetail.orderNo ?? 0,
    existingStack: existingStack
      ? {
          id: existingStack.id,
          data: existingStack as unknown as DocumentData,
        }
      : undefined,
    includeSpeciesImages: true,
    shouldInterrupt: options?.progressContext?.shouldInterrupt,
  });
  const operations = [
    ...(groupUpsert.operation ? [groupUpsert.operation] : []),
    ...stackRefreshResult.operations,
  ];
  await commitSetOperationsInBatches(
    operations,
    getPinkkaImportBatchCommitOptions(operations.length),
  );
  await commitDeleteReferencesInBatches(
    stackRefreshResult.deleteRefs,
    getPinkkaImportBatchCommitOptions(stackRefreshResult.deleteRefs.length),
  );
  await markPinkkaStackAndSpeciesImportCompleted({
    groupId: resolvedGroupId,
    stackId,
    speciesIds: stackRefreshResult.pinkkaSpeciesIds,
  });
  await markPinkkaGroupImportCompletedDirect(resolvedGroupId);
  markGroupCompleted(options?.progressContext, resolvedGroupId, groupName);
  markStackCompleted(
    options?.progressContext,
    resolvedGroupId,
    stackId,
    stackName,
  );
  return {
    importId: resolvedImportId,
    groupId: canonicalGroupId,
    stackIds: [stackRefreshResult.stackId],
    learningItemIds: [],
    speciesIds: [],
  };
}

/**
 * Import multiple Pinkka stacks with their species into the pinkka hierarchy.
 */
export async function importPinkkaStacks(
  stackIds: number[],
  ownerId: string,
  importId?: string,
  options?: {
    groupId?: number;
    onProgress?: PinkkaImportProgressCallback;
    shouldInterrupt?: () => boolean;
    force?: boolean;
  },
): Promise<PinkkaImportResult[]> {
  const resolvedImportId = importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];
  const progressContext = createPinkkaImportProgressContext({
    mode: "stacks",
    onProgress: options?.onProgress,
    shouldInterrupt: options?.shouldInterrupt,
    initialProgress: {
      groups: {
        total: options?.groupId !== undefined ? 1 : 0,
      },
      stacks: {
        total: stackIds.length,
      },
    },
  });
  emitPinkkaImportProgress(progressContext);

  for (const stackId of stackIds) {
    assertPinkkaImportNotInterrupted(progressContext);
    const result = await importPinkkaStack(stackId, ownerId, {
      importId: resolvedImportId,
      upsert: shouldUpsert,
      groupId: options?.groupId,
      progressContext,
      force: options?.force,
    });
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Import a single Pinkka species detail directly into canonical app content.
 */
export async function importPinkkaSpecies(
  speciesId: number,
  ownerId: string,
  options?: {
    importId?: string;
    upsert?: boolean;
    groupId?: number;
    stackId?: number;
    progressContext?: PinkkaImportProgressContext;
    force?: boolean;
  },
): Promise<PinkkaImportResult | null> {
  void options?.upsert;
  assertPinkkaImportNotInterrupted(options?.progressContext);
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  if (options?.groupId !== undefined) {
    updateCurrentEntityProgress(
      options.progressContext,
      "groups",
      `Group ${options.groupId}`,
    );
  }
  if (options?.stackId !== undefined) {
    updateCurrentEntityProgress(
      options.progressContext,
      "stacks",
      `Stack ${options.stackId}`,
    );
  }
  updateCurrentEntityProgress(
    options?.progressContext,
    "species",
    `Species ${speciesId}`,
  );
  const speciesDetail = await fetchPinkkaSpecies(speciesId);
  if (!speciesDetail) return null;
  const speciesLocation =
    options?.groupId !== undefined && options?.stackId !== undefined
      ? { groupId: options.groupId, stackId: options.stackId }
      : await resolveSpeciesLocation(speciesId);
  if (!speciesLocation) return null;
  const groupDetail = await fetchPinkkaGroupWithStacks(speciesLocation.groupId);
  const stackDetail = await fetchPinkkaSubStack(speciesLocation.stackId);
  if (!groupDetail || !stackDetail) return null;
  const now = Timestamp.now();
  const groupName = getPinkkaGroupDisplayName(groupDetail);
  const stackName = getPinkkaStackDisplayName(stackDetail);
  updateCurrentEntityProgress(options?.progressContext, "groups", groupName);
  updateCurrentEntityProgress(options?.progressContext, "stacks", stackName);
  const speciesName = getPinkkaSpeciesDisplayName(speciesId, speciesDetail);
  updateCurrentEntityProgress(
    options?.progressContext,
    "species",
    speciesName,
    speciesDetail.images?.length ?? 0,
  );
  const existingGroup = await findCanonicalGroupByPinkkaGroupId(
    speciesLocation.groupId,
  );
  const groupUpsert = await buildCanonicalPinkkaGroupUpsertOperation({
    pinkkaGroup: groupDetail,
    ownerId,
    order:
      existingGroup?.order ??
      (await getGroups(ownerId, { includeHidden: true })).length,
    existingGroup,
    now,
  });
  const canonicalGroupId = groupUpsert.groupId;
  const existingStack = existingGroup
    ? await findCanonicalStackByPinkkaRef({
        groupId: canonicalGroupId,
        pinkkaGroupId: speciesLocation.groupId,
        pinkkaStackId: speciesLocation.stackId,
      })
    : null;
  const sourceRecord = buildPinkkaSourceRecord<SpeciesData>({
    entityType: "species",
    externalId: speciesId,
    data: await mapPinkkaSpeciesDetailToContentData(speciesDetail, {
      includeImages: true,
      resolveStoredImageUrls: false,
    }),
  });
  const upsertSpecies = await buildCanonicalLearningItemUpsertOperation({
    existingSpecies:
      await findCanonicalLearningItemBySourceRecord(sourceRecord),
    ownerId,
    sourceRecord,
    pinkkaRef: {
      speciesId,
    },
    now,
  });
  const nextStackSpeciesIds = dedupeIds([
    ...getStackLinkedLearningItemIds(existingStack ?? {}),
    upsertSpecies.speciesId,
  ]);
  const stackUpsert = await buildCanonicalPinkkaStackUpsertOperation({
    canonicalGroupId,
    pinkkaGroupId: speciesLocation.groupId,
    pinkkaStack: stackDetail,
    ownerId,
    order: existingStack?.order ?? stackDetail.orderNo ?? 0,
    speciesIds: nextStackSpeciesIds,
    existingStack,
    now,
  });
  await commitSetOperationsInBatches(
    [
      groupUpsert.operation,
      stackUpsert.operation,
      upsertSpecies.operation,
    ].filter((operation): operation is BatchSetOperation => Boolean(operation)),
    getPinkkaImportBatchCommitOptions(
      [
        groupUpsert.operation,
        stackUpsert.operation,
        upsertSpecies.operation,
      ].filter((operation): operation is BatchSetOperation =>
        Boolean(operation),
      ).length,
    ),
  );
  await markPinkkaStackAndSpeciesImportCompleted({
    groupId: speciesLocation.groupId,
    stackId: speciesLocation.stackId,
    speciesIds: [speciesId],
  });
  await markPinkkaGroupImportCompletedDirect(speciesLocation.groupId);
  markGroupCompleted(
    options?.progressContext,
    speciesLocation.groupId,
    groupName,
  );
  markStackCompleted(
    options?.progressContext,
    speciesLocation.groupId,
    speciesLocation.stackId,
    stackName,
  );
  if (options?.progressContext) {
    options.progressContext.progress.species.completed += 1;
    emitPinkkaImportProgress(options.progressContext);
  }

  return {
    importId: resolvedImportId,
    groupId: canonicalGroupId,
    stackIds: [stackUpsert.stackId],
    learningItemIds: [upsertSpecies.speciesId],
    speciesIds: [upsertSpecies.speciesId],
  };
}

/**
 * Import multiple Pinkka species details into the pinkka hierarchy.
 */
export async function importPinkkaSpeciesList(
  speciesIds: number[],
  ownerId: string,
  importId?: string,
  options?: {
    groupId?: number;
    stackId?: number;
    onProgress?: PinkkaImportProgressCallback;
    shouldInterrupt?: () => boolean;
    force?: boolean;
  },
): Promise<PinkkaImportResult[]> {
  const resolvedImportId = importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];
  const progressContext = createPinkkaImportProgressContext({
    mode: "species",
    onProgress: options?.onProgress,
    shouldInterrupt: options?.shouldInterrupt,
    initialProgress: {
      groups: {
        total: options?.groupId !== undefined ? 1 : 0,
      },
      stacks: {
        total: options?.stackId !== undefined ? 1 : 0,
      },
      species: {
        total: speciesIds.length,
      },
    },
  });
  emitPinkkaImportProgress(progressContext);

  for (const speciesId of speciesIds) {
    assertPinkkaImportNotInterrupted(progressContext);
    const result = await importPinkkaSpecies(speciesId, ownerId, {
      importId: resolvedImportId,
      upsert: shouldUpsert,
      groupId: options?.groupId,
      stackId: options?.stackId,
      progressContext,
      force: options?.force,
    });
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Import multiple Pinkka groups directly into canonical app content.
 */
export async function importPinkkaGroups(
  groupIds: number[],
  ownerId: string,
  importId?: string,
  options?: PinkkaImportControlOptions,
): Promise<PinkkaImportResult[]> {
  const resolvedImportId = importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];
  const progressContext = createPinkkaImportProgressContext({
    mode: "groups",
    onProgress: options?.onProgress,
    shouldInterrupt: options?.shouldInterrupt,
    initialProgress: {
      groups: {
        total: groupIds.length,
      },
    },
  });
  emitPinkkaImportProgress(progressContext);

  for (const groupId of groupIds) {
    assertPinkkaImportNotInterrupted(progressContext);
    const result = await importPinkkaGroup(groupId, ownerId, {
      importId: resolvedImportId,
      upsert: shouldUpsert,
      progressContext,
      force: options?.force,
    });
    if (result) {
      results.push(result);
    }
  }

  return results;
}

// Learning-item operations
/** Create a learning item and link it to the provided stacks. */
export async function createLearningItem(
  species: Omit<Species, "id" | "createdAt" | "updatedAt">,
  stackIds: string[] = [],
): Promise<string> {
  const speciesId = buildCanonicalId();
  const speciesRef = getCanonicalLearningItemRef(speciesId);
  const now = Timestamp.now();
  const newSpecies = {
    ...species,
    learningItemId: speciesId,
    speciesId,
    isHidden: species.isHidden ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(speciesRef, newSpecies);

  const uniqueStackIds = dedupeIds(stackIds);
  await Promise.all(
    uniqueStackIds.map(async (stackId) => {
      const stack = await getStack(stackId, { includeHidden: true });
      if (!stack) return;
      const nextSpeciesIds = dedupeIds([
        ...getStackLinkedLearningItemIds(stack),
        speciesId,
      ]);
      await updateStackSpeciesLinks(stackId, nextSpeciesIds);
    }),
  );

  return speciesId;
}

/** Fetch learning items, optionally filtered by stack and visibility. */
export async function getLearningItems(
  stackId?: string,
  options?: { includeHidden?: boolean },
): Promise<Species[]> {
  const includeHidden = options?.includeHidden ?? false;
  if (stackId) {
    const stack = await getStack(stackId, { includeHidden: true });
    if (!stack) return [];
    if (!includeHidden && stack.isHidden) return [];

    const linkedLearningItems = await getCanonicalLearningItemDocsByIds(
      getStackLinkedLearningItemIds(stack),
    );
    if (linkedLearningItems.length > 0) {
      const speciesById = new Map(
        linkedLearningItems.map((item) => [item.id, item as Species]),
      );
      const orderedLinkedSpecies = getStackLinkedLearningItemIds(stack).reduce<
        Species[]
      >((acc, speciesId, index) => {
        const species = speciesById.get(speciesId);
        if (species) {
          acc.push({ ...species, order: index });
        }
        return acc;
      }, []);
      return includeHidden
        ? orderedLinkedSpecies
        : orderedLinkedSpecies.filter((item) => !item.isHidden);
    }

    const nestedGroupId = stack.parentGroupId;
    if (nestedGroupId) {
      const speciesSnapshot = await getDocs(
        collection(db, "groups", nestedGroupId, "stacks", stackId, "species"),
      );
      const species = sortByOrder(
        speciesSnapshot.docs.map((docSnapshot) =>
          toSpeciesFromDoc(docSnapshot),
        ),
      );
      return includeHidden ? species : species.filter((item) => !item.isHidden);
    }

    const nestedStackLocation = await resolveNestedStackLocation(stackId);
    if (nestedStackLocation) {
      const speciesSnapshot = await getDocs(
        collection(
          db,
          "groups",
          nestedStackLocation.groupId,
          "stacks",
          stackId,
          "species",
        ),
      );
      const species = sortByOrder(
        speciesSnapshot.docs.map((docSnapshot) =>
          toSpeciesFromDoc(docSnapshot),
        ),
      );
      return includeHidden ? species : species.filter((item) => !item.isHidden);
    }

    const hierarchicalSnapshot = await getDocs(
      query(
        collection(db, LEGACY_CANONICAL_SPECIES_COLLECTION),
        where("parentStackId", "==", stackId),
      ),
    );
    const species = sortByOrder(
      hierarchicalSnapshot.docs.map((docSnapshot) =>
        toSpeciesFromDoc(docSnapshot),
      ),
    );
    return includeHidden ? species : species.filter((item) => !item.isHidden);
  }

  const [learningItemsSnapshot, legacySpeciesSnapshot] = await Promise.all([
    getDocs(query(collection(db, CANONICAL_LEARNING_ITEMS_COLLECTION))),
    getDocs(query(collection(db, LEGACY_CANONICAL_SPECIES_COLLECTION))),
  ]);
  const speciesById = new Map<string, Species>();
  learningItemsSnapshot.docs.forEach((docSnapshot) => {
    speciesById.set(docSnapshot.id, toSpeciesFromDoc(docSnapshot));
  });
  legacySpeciesSnapshot.docs.forEach((docSnapshot) => {
    if (!speciesById.has(docSnapshot.id)) {
      speciesById.set(docSnapshot.id, toSpeciesFromDoc(docSnapshot));
    }
  });
  const species = sortByOrder(
    [...speciesById.values()].map((docSnapshot) => docSnapshot),
  );
  return includeHidden ? species : species.filter((item) => !item.isHidden);
}

/** Fetch a single learning item by id. */
export async function getLearningItemById(
  speciesId: string,
): Promise<Species | null> {
  const speciesDoc = await getCanonicalLearningItemSnapshot(speciesId);
  if (speciesDoc) {
    return toSpeciesFromDoc(speciesDoc);
  }

  const nestedLocation = await resolveNestedSpeciesLocation(speciesId);
  if (!nestedLocation) {
    return null;
  }

  return toSpeciesFromDoc(nestedLocation.doc);
}

/** Update a learning item with partial fields. */
export async function updateLearningItem(
  speciesId: string,
  updates: Partial<Species>,
): Promise<void> {
  const canonicalSpecies = await ensureCanonicalLearningItemDocument(speciesId);
  if (!canonicalSpecies) {
    throw new Error(`Species ${speciesId} was not found.`);
  }

  const nextData = updates.data;
  const hasSourceRecords =
    (canonicalSpecies.sourceRecords?.length ?? 0) > 0 ||
    (updates.sourceRecords?.length ?? 0) > 0;
  const nextManualOverrides =
    nextData && hasSourceRecords
      ? deriveManualOverrides(
          (canonicalSpecies.sourceRecords?.[
            canonicalSpecies.sourceRecords.length - 1
          ]?.data ?? canonicalSpecies.data) as SpeciesData,
          nextData,
        )
      : updates.manualOverrides;
  const nextSourceRecords =
    updates.sourceRecords ?? canonicalSpecies.sourceRecords;

  await updateCanonicalLearningItemDocument(speciesId, {
    ...updates,
    ...(nextData ? { data: nextData } : {}),
    ...(nextSourceRecords ? { sourceRecords: nextSourceRecords } : {}),
    ...(getContentSourceKeys(nextSourceRecords)
      ? { sourceKeys: getContentSourceKeys(nextSourceRecords) }
      : {}),
    ...(nextManualOverrides ? { manualOverrides: nextManualOverrides } : {}),
    updatedAt: Timestamp.now(),
  });
}

/** Remove one linked learning item from a stack without deleting the canonical learning item. */
export async function unlinkLearningItemFromStack(
  stackId: string,
  speciesId: string,
): Promise<void> {
  const stack = await getStack(stackId, { includeHidden: true });
  if (!stack) return;
  await updateStackSpeciesLinks(
    stackId,
    getStackLinkedLearningItemIds(stack).filter((id) => id !== speciesId),
  );
}

/** Link one canonical learning item to a stack if not already linked. */
export async function linkLearningItemToStack(
  stackId: string,
  speciesId: string,
): Promise<void> {
  const stack = await getStack(stackId, { includeHidden: true });
  if (!stack) {
    throw new Error(`Stack ${stackId} was not found.`);
  }
  const species = await ensureCanonicalLearningItemDocument(speciesId);
  if (!species) {
    throw new Error(`Species ${speciesId} was not found.`);
  }
  await updateStackSpeciesLinks(
    stackId,
    dedupeIds([...getStackLinkedLearningItemIds(stack), speciesId]),
  );
}

/** Delete a learning item and unlink it from all stacks. */
export async function deleteLearningItem(
  speciesId: string,
  options?: { groupId?: string; stackId?: string },
): Promise<void> {
  if (options?.stackId) {
    await unlinkLearningItemFromStack(options.stackId, speciesId);
    return;
  }

  const speciesDoc = await getCanonicalLearningItemSnapshot(speciesId);
  if (speciesDoc) {
    const speciesData = speciesDoc.data();
    if (!speciesData) {
      return;
    }
    const sourceKinds = Array.isArray(speciesData.sourceRecords)
      ? (speciesData.sourceRecords as Array<{ source?: string }>)
          .map((record) => record.source)
          .filter(Boolean)
      : [];
    let isLinkedToPinkka =
      Boolean(speciesData.pinkkaRef) || sourceKinds.includes("pinkka");

    const stackQuery = query(
      collection(db, "groups"),
      where("stackIds", "!=", null),
    );
    void stackQuery;

    const stackSnapshot = await getDocs(collectionGroup(db, "stacks"));
    const linkedStacks = stackSnapshot.docs.filter((stackDoc) =>
      getStackLinkedLearningItemIdsFromData(stackDoc.data()).includes(
        speciesId,
      ),
    );
    if (!isLinkedToPinkka) {
      isLinkedToPinkka = linkedStacks.some((stackDoc) =>
        Boolean(stackDoc.data().pinkkaRef),
      );
    }

    if (!isLinkedToPinkka) {
      const images = speciesData.data?.images || [];
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
    }

    await Promise.all(
      linkedStacks.map(async (stackDoc) => {
        const speciesIds = getStackLinkedLearningItemIdsFromData(
          stackDoc.data(),
        );
        await updateDoc(stackDoc.ref, {
          [STACK_LEARNING_ITEM_IDS_FIELD]: speciesIds.filter(
            (id) => id !== speciesId,
          ),
          speciesIds: speciesIds.filter((id) => id !== speciesId),
          updatedAt: Timestamp.now(),
        });
      }),
    );

    const deleteTargets = [
      getCanonicalLearningItemRef(speciesId),
      getLegacyCanonicalSpeciesRef(speciesId),
    ];
    await Promise.all(
      deleteTargets.map(async (targetRef) => {
        const snapshot = await getDoc(targetRef);
        if (snapshot.exists()) {
          await deleteDoc(targetRef);
        }
      }),
    );
  }

  const nestedLocation =
    options?.groupId && options?.stackId
      ? {
          groupId: options.groupId,
          stackId: options.stackId,
        }
      : await resolveNestedSpeciesLocation(speciesId);
  if (nestedLocation) {
    await deleteDoc(
      doc(
        db,
        "groups",
        nestedLocation.groupId,
        "stacks",
        nestedLocation.stackId,
        "species",
        speciesId,
      ),
    );
  }
}

/** Update learning-item ordering under a stack. */
export async function updateStackLearningItemOrder(
  stackId: string,
  speciesIds: string[],
): Promise<void> {
  await updateStackSpeciesLinks(stackId, speciesIds);
}

// Image operations
/** Upload an image to storage and return its metadata. */
export async function uploadLearningItemImage(
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

/** Delete an image from storage and update learning-item metadata. */
export async function deleteLearningItemImage(
  speciesId: string,
  imageUrl: string,
): Promise<void> {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);

    // Update species document to remove image
    const speciesDoc = await getCanonicalLearningItemSnapshot(speciesId);
    if (speciesDoc) {
      const speciesData = speciesDoc.data();
      const images = speciesData?.data?.images || [];
      const updatedImages = images.filter((img: SpeciesImage) => {
        const urls = img.urls || {};
        return !Object.values(urls).includes(imageUrl);
      });
      await updateCanonicalLearningItemDocument(speciesId, {
        "data.images": updatedImages,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}

/** @deprecated Use `createLearningItem`. */
export const createSpecies = createLearningItem;

/** @deprecated Use `getLearningItems`. */
export const getSpecies = getLearningItems;

/** @deprecated Use `getLearningItemById`. */
export const getSpeciesById = getLearningItemById;

/** @deprecated Use `updateLearningItem`. */
export const updateSpecies = updateLearningItem;

/** @deprecated Use `unlinkLearningItemFromStack`. */
export const unlinkSpeciesFromStack = unlinkLearningItemFromStack;

/** @deprecated Use `linkLearningItemToStack`. */
export const linkSpeciesToStack = linkLearningItemToStack;

/** @deprecated Use `deleteLearningItem`. */
export const deleteSpecies = deleteLearningItem;

/** @deprecated Use `updateStackLearningItemOrder`. */
export const updateStackSpeciesOrder = updateStackLearningItemOrder;

/** @deprecated Use `uploadLearningItemImage`. */
export const uploadSpeciesImage = uploadLearningItemImage;

/** @deprecated Use `deleteLearningItemImage`. */
export const deleteSpeciesImage = deleteLearningItemImage;

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
