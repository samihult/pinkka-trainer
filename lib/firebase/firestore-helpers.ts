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
  LearningNameType,
  LearningProgress,
  LearningProgressState,
  StackLearningHistogram,
  QuizPreferences,
  Species,
  Stack,
  Group,
  SpeciesImage,
  EntityImage,
  User,
} from "../types";
import { normalizeQuizPreferences } from "../quiz/quiz-preferences";
import {
  fetchPinkkaGroupWithStacks,
  fetchPinkkaGroups,
  fetchPinkkaSpecies,
  fetchPinkkaSubStack,
  type PinkkaGroup,
  type PinkkaImageAsset,
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
  /** Number of created species. */
  createdSpeciesCount: number;
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
let pendingPinkkaGroupStatusFlush:
  | ReturnType<typeof setTimeout>
  | undefined;

type PendingStackStatus = {
  groupId: number;
  stackId: number;
  resolvers: Resolver<PinkkaImportStatus>[];
};

const pendingPinkkaStackStatusResolvers = new Map<string, PendingStackStatus>();
let pendingPinkkaStackStatusFlush:
  | ReturnType<typeof setTimeout>
  | undefined;

type PendingSpeciesStatus = {
  groupId: number;
  stackId: number;
  speciesId: number;
  resolvers: Resolver<PinkkaImportStatus>[];
};

const pendingPinkkaSpeciesStatusResolvers = new Map<string, PendingSpeciesStatus>();
let pendingPinkkaSpeciesStatusFlush:
  | ReturnType<typeof setTimeout>
  | undefined;
const pinkkaImportedImageUrlCache = new Map<string, string>();

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

const FIRESTORE_BATCH_WRITE_MAX = 450;

type BatchSetOperation = {
  ref: DocumentReference;
  data: Record<string, unknown>;
};

async function commitSetOperationsInBatches(
  operations: BatchSetOperation[],
): Promise<void> {
  for (const chunk of chunkArray(operations, FIRESTORE_BATCH_WRITE_MAX)) {
    const batch = writeBatch(db);
    for (const operation of chunk) {
      batch.set(operation.ref, operation.data);
    }
    await batch.commit();
  }
}

async function commitDeleteReferencesInBatches(
  refs: DocumentReference[],
): Promise<void> {
  for (const chunk of chunkArray(refs, FIRESTORE_BATCH_WRITE_MAX)) {
    const batch = writeBatch(db);
    for (const refToDelete of chunk) {
      batch.delete(refToDelete);
    }
    await batch.commit();
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

function emitPinkkaImportProgress(
  context?: PinkkaImportProgressContext,
): void {
  context?.onProgress?.(clonePinkkaImportProgress(context.progress));
}

function getMultilingualName(
  value:
    | { fi?: string; en?: string; sv?: string }
    | undefined,
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
  const snapshot = await getDocs(collection(db, PINKKA_COLLECTION));
  const results: ImportedPinkkaGroupEntry[] = [];

  for (const docSnapshot of snapshot.docs) {
    const status = getPinkkaImportStatusFromDocData(docSnapshot.data());
    if (!status.isImported) {
      continue;
    }

    const data = docSnapshot.data() as { entity?: unknown };
    const entity = data.entity as PinkkaGroup | undefined;
    if (!entity) {
      continue;
    }

    const normalizedGroupId =
      typeof entity.id === "number"
        ? entity.id
        : Number.parseInt(docSnapshot.id, 10);
    if (!Number.isFinite(normalizedGroupId)) {
      continue;
    }

    results.push({
      groupId: normalizedGroupId,
      entity,
      stackCount: entity.subPinkkas?.length ?? 0,
      isIncomplete: status.isIncomplete,
    });
  }

  results.sort((left, right) => left.groupId - right.groupId);
  return results;
}

/** List imported Pinkka species for a group stack from the pinkka hierarchy. */
export async function getImportedPinkkaSpeciesEntries(
  groupId: number,
  stackId: number,
): Promise<ImportedPinkkaSpeciesEntry[]> {
  const snapshot = await getDocs(
    collection(
      db,
      PINKKA_COLLECTION,
      String(groupId),
      "stacks",
      String(stackId),
      "species",
    ),
  );

  const results: ImportedPinkkaSpeciesEntry[] = [];
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data() as { entity?: unknown };
    const entity = data.entity as PinkkaSpeciesDetail | undefined;
    if (!entity) {
      continue;
    }

    const normalizedSpeciesId = Number.parseInt(docSnapshot.id, 10);
    if (!Number.isFinite(normalizedSpeciesId)) {
      continue;
    }

    results.push({
      speciesId: normalizedSpeciesId,
      entity,
    });
  }

  results.sort((left, right) =>
    left.entity.scientificName.localeCompare(right.entity.scientificName),
  );
  return results;
}

/** List imported Pinkka stacks for a group from the pinkka hierarchy. */
export async function getImportedPinkkaStackEntries(
  groupId: number,
): Promise<ImportedPinkkaStackEntry[]> {
  const snapshot = await getDocs(
    collection(db, PINKKA_COLLECTION, String(groupId), "stacks"),
  );

  const results: ImportedPinkkaStackEntry[] = [];
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data() as { entity?: unknown };
    const entity = data.entity as PinkkaSubStack | undefined;
    if (!entity) {
      continue;
    }

    const normalizedStackId =
      typeof entity.id === "number"
        ? entity.id
        : Number.parseInt(docSnapshot.id, 10);
    if (!Number.isFinite(normalizedStackId)) {
      continue;
    }

    results.push({
      stackId: normalizedStackId,
      entity,
    });
  }

  results.sort(
    (left, right) => (left.entity.orderNo ?? 0) - (right.entity.orderNo ?? 0),
  );
  return results;
}

/** Fetch import state for Pinkka groups in batch. */
export async function getPinkkaGroupImportStateMap(
  groupIds: number[],
): Promise<Record<number, PinkkaImportStatus>> {
  const uniqueIds = toUniqueIds(groupIds);
  const statuses: Record<number, PinkkaImportStatus> = {};
  const missingIds: number[] = [];

  for (const groupId of uniqueIds) {
    const cachedStatus = pinkkaGroupImportStatusCache.get(groupId);
    if (cachedStatus !== undefined) {
      statuses[groupId] = cachedStatus;
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
      const statusById = new Map<string, PinkkaImportStatus>();
      for (const docSnapshot of snapshot.docs) {
        statusById.set(
          docSnapshot.id,
          getPinkkaImportStatusFromDocData(docSnapshot.data()),
        );
      }

      for (const groupId of chunk) {
        const status = statusById.get(String(groupId)) ?? NOT_IMPORTED_STATUS;
        pinkkaGroupImportStatusCache.set(groupId, status);
        statuses[groupId] = status;
      }
    }
  } catch (error) {
    console.error("Failed to fetch batch Pinkka group import states", error);
    for (const groupId of missingIds) {
      statuses[groupId] = NOT_IMPORTED_STATUS;
    }
  }

  for (const groupId of uniqueIds) {
    if (statuses[groupId] === undefined) {
      statuses[groupId] = NOT_IMPORTED_STATUS;
    }
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
  const missingIds: number[] = [];

  for (const stackId of uniqueIds) {
    const cachedStatus = pinkkaStackImportStatusCache.get(stackId);
    if (cachedStatus !== undefined) {
      statuses[stackId] = cachedStatus;
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
      const statusById = new Map<string, PinkkaImportStatus>();
      for (const docSnapshot of snapshot.docs) {
        statusById.set(
          docSnapshot.id,
          getPinkkaImportStatusFromDocData(docSnapshot.data()),
        );
      }

      for (const stackId of chunk) {
        const status = statusById.get(String(stackId)) ?? NOT_IMPORTED_STATUS;
        pinkkaStackImportStatusCache.set(stackId, status);
        statuses[stackId] = status;
      }
    }
  } catch (error) {
    console.error(
      `Failed to fetch batch Pinkka stack import states for group ${groupId}`,
      error,
    );
    for (const stackId of missingIds) {
      statuses[stackId] = NOT_IMPORTED_STATUS;
    }
  }

  for (const stackId of uniqueIds) {
    if (statuses[stackId] === undefined) {
      statuses[stackId] = NOT_IMPORTED_STATUS;
    }
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
  const missingIds: number[] = [];

  for (const speciesId of uniqueIds) {
    const cachedStatus = pinkkaSpeciesImportStatusCache.get(speciesId);
    if (cachedStatus !== undefined) {
      statuses[speciesId] = cachedStatus;
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
      const statusById = new Map<string, PinkkaImportStatus>();
      for (const docSnapshot of snapshot.docs) {
        statusById.set(
          docSnapshot.id,
          getPinkkaImportStatusFromDocData(docSnapshot.data()),
        );
      }

      for (const speciesId of chunk) {
        const status = statusById.get(String(speciesId)) ?? NOT_IMPORTED_STATUS;
        pinkkaSpeciesImportStatusCache.set(speciesId, status);
        statuses[speciesId] = status;
      }
    }
  } catch (error) {
    console.error(
      `Failed to fetch batch Pinkka species import states for group ${groupId}, stack ${stackId}`,
      error,
    );
    for (const speciesId of missingIds) {
      statuses[speciesId] = NOT_IMPORTED_STATUS;
    }
  }

  for (const speciesId of uniqueIds) {
    if (statuses[speciesId] === undefined) {
      statuses[speciesId] = NOT_IMPORTED_STATUS;
    }
  }

  return statuses;
}

/** Fetch imported status for Pinkka groups in batch. */
export async function getPinkkaGroupImportStatusMap(
  groupIds: number[],
): Promise<Record<number, boolean>> {
  const statusMap = await getPinkkaGroupImportStateMap(groupIds);
  return Object.fromEntries(
    groupIds.map((groupId) => [groupId, statusMap[groupId]?.isImported === true]),
  );
}

/** Fetch imported status for Pinkka stacks in a group, in batch. */
export async function getPinkkaStackImportStatusMap(
  groupId: number,
  stackIds: number[],
): Promise<Record<number, boolean>> {
  const statusMap = await getPinkkaStackImportStateMap(groupId, stackIds);
  return Object.fromEntries(
    stackIds.map((stackId) => [stackId, statusMap[stackId]?.isImported === true]),
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

function getPreferredPinkkaImageUrl(
  image: PinkkaImageAsset,
): string | null {
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
  const cached = forceDownload ? undefined : pinkkaImportedImageUrlCache.get(sourceUrl);
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
      getImageFilenameFromUrl(sourceUrl) ??
      `${pinkkaImageId}.jpg`;
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
  const filename =
    getImageFilenameFromUrl(sourceUrl) ??
    `${pinkkaImageId}.jpg`;
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
  const imageRef = ref(storage, `pinkka/${imageIdPathPart}/${filenamePathPart}`);
  try {
    return await getDownloadURL(imageRef);
  } catch {
    return null;
  }
}

async function mapPinkkaImageAssetsToEntityImages(params: {
  assets: PinkkaImageAsset[];
  fallbackIdPrefix: string;
}): Promise<EntityImage[]> {
  const mappedImages: EntityImage[] = [];
  for (let index = 0; index < params.assets.length; index += 1) {
    const asset = params.assets[index];
    const sourceUrl = getPreferredPinkkaImageUrl(asset);
    if (!sourceUrl) {
      continue;
    }

    const pinkkaImageId =
      asset.id || `${params.fallbackIdPrefix}-${index + 1}`;
    const filename =
      getImageFilenameFromUrl(sourceUrl) ?? `${pinkkaImageId}.jpg`;

    let storedUrl = await getStoredPinkkaImageDownloadUrl({
      pinkkaImageId,
      filename,
    });

    if (!storedUrl) {
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

/** Convert Pinkka species detail payload to app species data with storage URLs. */
export async function mapPinkkaSpeciesDetailToContentData(
  detail: PinkkaSpeciesDetail,
  options?: { includeImages?: boolean },
): Promise<Species["data"]> {
  const includeImages = options?.includeImages ?? true;
  if (!includeImages) {
    return {
      taxonId: detail.taxonId,
      scientificName: detail.scientificName,
      ...(detail.vernacularName ? { vernacularName: detail.vernacularName } : {}),
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

    if (sourceUrl) {
      const pinkkaImageId =
        sourceImage.id || `${detail.taxonId || detail.scientificName}-${index + 1}`;
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
        sourceImage.id || `${detail.taxonId || detail.scientificName}-${index + 1}`,
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
}): Promise<CreateGroupFromPinkkaImportResult> {
  const includeImages = params.includeImages ?? false;
  const groupId = buildUrnId("group");
  const now = Timestamp.now();
  const groupImages = await mapPinkkaImageAssetsToEntityImages({
    assets: getPinkkaGroupImageAssets(params.sourceGroup.entity),
    fallbackIdPrefix: `group-${params.sourceGroup.groupId}`,
  });

  const operations: BatchSetOperation[] = [];
  operations.push({
    ref: doc(db, "groups", groupId),
    data: {
      data: {
        name: params.sourceGroup.entity.name,
        ...(params.sourceGroup.entity.description
          ? { description: params.sourceGroup.entity.description }
          : {}),
      },
      pinkkaRef: {
        groupId: params.sourceGroup.groupId,
      },
      images: groupImages,
      ownerId: params.ownerId,
      order: params.order,
      isHidden: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  const importedStackEntries = await getImportedPinkkaStackEntries(
    params.sourceGroup.groupId,
  );
  const importedStackById = new Map<number, PinkkaSubStack>(
    importedStackEntries.map((entry) => [entry.stackId, entry.entity]),
  );
  const groupStackById = new Map<number, PinkkaSubStack>(
    (params.sourceGroup.entity.subPinkkas ?? []).map((stack) => [stack.id, stack]),
  );
  const mergedStackIds = new Set<number>([
    ...groupStackById.keys(),
    ...importedStackById.keys(),
  ]);
  const sourceStacks = [...mergedStackIds]
    .map((stackId) => importedStackById.get(stackId) ?? groupStackById.get(stackId))
    .filter((stack): stack is PinkkaSubStack => stack !== undefined)
    .sort((left, right) => (left.orderNo ?? 0) - (right.orderNo ?? 0));
  const importedSpeciesByStack = await Promise.all(
    sourceStacks.map(async (sourceStack) => ({
      stackId: sourceStack.id,
      entries: await getImportedPinkkaSpeciesEntries(
        params.sourceGroup.groupId,
        sourceStack.id,
      ),
    })),
  );
  const importedSpeciesMap = new Map<number, ImportedPinkkaSpeciesEntry[]>(
    importedSpeciesByStack.map((entry) => [entry.stackId, entry.entries]),
  );

  let createdSpeciesCount = 0;
  for (let stackIndex = 0; stackIndex < sourceStacks.length; stackIndex += 1) {
    const sourceStack = sourceStacks[stackIndex];
    const stackId = buildUrnId("stack");
    const stackImages = await mapPinkkaImageAssetsToEntityImages({
      assets: getPinkkaStackImageAssets(sourceStack),
      fallbackIdPrefix: sourceStack.imageId || `stack-${sourceStack.id}`,
    });
    operations.push({
      ref: doc(db, "groups", groupId, "stacks", stackId),
      data: {
        stackId,
        parentGroupId: groupId,
        data: {
          name: sourceStack.name,
          ...(sourceStack.description ? { description: sourceStack.description } : {}),
        },
        pinkkaRef: {
          groupId: params.sourceGroup.groupId,
          stackId: sourceStack.id,
        },
        images: stackImages,
        ownerId: params.ownerId,
        order: stackIndex,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    const importedSpecies = importedSpeciesMap.get(sourceStack.id) ?? [];
    const importedSpeciesIds = new Set<number>();
    let speciesIndex = 0;
    for (const importedSpeciesEntry of importedSpecies) {
      importedSpeciesIds.add(importedSpeciesEntry.speciesId);
      const speciesId = buildUrnId("species");
      const mappedData = await mapPinkkaSpeciesDetailToContentData(
        importedSpeciesEntry.entity,
        { includeImages },
      );
      operations.push({
        ref: doc(
          db,
          "groups",
          groupId,
          "stacks",
          stackId,
          "species",
          speciesId,
        ),
        data: {
          speciesId,
          parentGroupId: groupId,
          parentStackId: stackId,
          data: mappedData,
          pinkkaRef: {
            groupId: params.sourceGroup.groupId,
            stackId: sourceStack.id,
            speciesId: importedSpeciesEntry.speciesId,
          },
          ownerId: params.ownerId,
          order: speciesIndex,
          isHidden: false,
          createdAt: now,
          updatedAt: now,
        },
      });
      createdSpeciesCount += 1;
      speciesIndex += 1;
    }

    const sourceSpeciesCards = (sourceStack.speciesCards ?? []).filter(
      (card) => !importedSpeciesIds.has(card.id),
    );
    for (const sourceSpeciesCard of sourceSpeciesCards) {
      const speciesId = buildUrnId("species");
      const speciesData: Species["data"] = {
        taxonId: sourceSpeciesCard.taxonId ?? "",
        scientificName: sourceSpeciesCard.scientificName ?? "",
        ...(sourceSpeciesCard.vernacularName
          ? { vernacularName: sourceSpeciesCard.vernacularName }
          : {}),
        images: [],
      };
      operations.push({
        ref: doc(db, "groups", groupId, "stacks", stackId, "species", speciesId),
        data: {
          speciesId,
          parentGroupId: groupId,
          parentStackId: stackId,
          data: speciesData,
          pinkkaRef: {
            groupId: params.sourceGroup.groupId,
            stackId: sourceStack.id,
            speciesId: sourceSpeciesCard.id,
          },
          ownerId: params.ownerId,
          order: speciesIndex,
          isHidden: false,
          createdAt: now,
          updatedAt: now,
        },
      });
      createdSpeciesCount += 1;
      speciesIndex += 1;
    }
  }

  await commitSetOperationsInBatches(operations);

  return {
    groupId,
    createdStackCount: sourceStacks.length,
    createdSpeciesCount,
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

async function markPinkkaEntityImportStarted(pathSegments: string[]): Promise<void> {
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

async function writePinkkaEntity<T>(
  pathSegments: string[],
  entity: T,
): Promise<void> {
  const payload: PinkkaEntityDocument<T> = {
    importDate: Timestamp.now(),
    entity,
  };
  await setDoc(getPinkkaEntityDocumentRef(pathSegments), payload, { merge: true });
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
    return ((value as { toDate: () => Date }).toDate?.() ?? new Date(0));
  }
  return new Date(0);
}

type FirestoreDocLike = {
  id: string;
  data: () => DocumentData | undefined;
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
  return {
    id: stackDoc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Stack;
}

function toSpeciesFromDoc(speciesDoc: FirestoreDocLike): Species {
  const data = speciesDoc.data() ?? {};
  return {
    id: speciesDoc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Species;
}

function buildUrnId(kind: "group" | "stack" | "species"): string {
  const randomPart = doc(collection(db, "__idSeeds")).id;
  return `pinkka:${kind}:${randomPart}`;
}

function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
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
        doc(db, "groups", groupDoc.id, "stacks", stackDoc.id, "species", speciesId),
      );
      if (!nestedSpeciesDoc.exists()) {
        continue;
      }
      return {
        groupId: groupDoc.id,
        stackId: stackDoc.id,
        speciesId: nestedSpeciesDoc.id,
        doc: nestedSpeciesDoc as FirestoreDocLike & { ref: ReturnType<typeof doc> },
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
  const groupId = buildUrnId("group");
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
  const groups = sortByOrder(snapshot.docs.map((docSnapshot) => toGroupFromDoc(docSnapshot)));
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
  await updateDoc(doc(db, "groups", groupId), {
    ...updates,
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
  const groupIsPinkkaLinked = Boolean(groupData.pinkkaRef);
  const deletedStackIds = new Set<string>();
  const refsToDelete: DocumentReference[] = [];
  const speciesImageDeletionTasks: Promise<void>[] = [];

  const nestedStacksSnapshot = await getDocs(
    collection(db, "groups", groupId, "stacks"),
  );
  for (const stackDoc of nestedStacksSnapshot.docs) {
    deletedStackIds.add(stackDoc.id);
    const stackIsPinkkaLinked =
      groupIsPinkkaLinked || Boolean(stackDoc.data().pinkkaRef);
    const speciesSnapshot = await getDocs(
      collection(db, "groups", groupId, "stacks", stackDoc.id, "species"),
    );
    for (const speciesDoc of speciesSnapshot.docs) {
      const speciesData = speciesDoc.data();
      const speciesIsPinkkaLinked =
        stackIsPinkkaLinked || Boolean(speciesData.pinkkaRef);
      if (!speciesIsPinkkaLinked) {
        speciesImageDeletionTasks.push(
          deleteSpeciesImagesFromDocumentData(speciesData),
        );
      }
      refsToDelete.push(speciesDoc.ref);
    }
    refsToDelete.push(stackDoc.ref);
  }

  const legacyStackIds = (groupData.stackIds ?? []) as string[];
  for (const legacyStackId of legacyStackIds) {
    if (deletedStackIds.has(legacyStackId)) {
      continue;
    }
    await deleteStack(legacyStackId);
  }

  await Promise.all(speciesImageDeletionTasks);
  refsToDelete.push(groupRef);
  await commitDeleteReferencesInBatches(refsToDelete);
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
  const stackId = buildUrnId("stack");
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
            .filter((stackItem) => (ownerId ? stackItem.ownerId === ownerId : true)),
        );
      }
    }

    return includeHidden ? stacks : stacks.filter((stack) => !stack.isHidden);
  }

  const groups = await getGroups(ownerId, { includeHidden: includeHidden });
  const mergedById = new Map<string, Stack>();

  for (const group of groups) {
    try {
      const groupStacks = await getStacks(group.id, ownerId, {
        includeHidden,
      });
      for (const stack of groupStacks) {
        mergedById.set(stack.id, stack);
      }
    } catch (error) {
      console.error(`Failed to fetch stacks for group ${group.id}`, error);
    }
  }

  const legacyQuery = ownerId
    ? query(collection(db, "stacks"), where("ownerId", "==", ownerId))
    : query(collection(db, "stacks"));
  const legacySnapshot = await getDocs(legacyQuery);
  for (const docSnapshot of legacySnapshot.docs) {
    if (!mergedById.has(docSnapshot.id)) {
      mergedById.set(docSnapshot.id, toStackFromDoc(docSnapshot));
    }
  }

  const stacks = sortByOrder([...mergedById.values()]);
  return includeHidden ? stacks : stacks.filter((stack) => !stack.isHidden);
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
  const nestedLocation = await resolveNestedStackLocation(stackId);
  const targetRef = nestedLocation
    ? doc(db, "groups", nestedLocation.groupId, "stacks", stackId)
    : doc(db, "stacks", stackId);
  await updateDoc(targetRef, {
    ...updates,
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
        doc: nestedStackDoc as FirestoreDocLike & { ref: ReturnType<typeof doc> },
      };
    }
  }

  if (!nestedLocation) {
    nestedLocation = await resolveNestedStackLocation(stackId);
  }

  if (nestedLocation) {
    const speciesSnapshot = await getDocs(
      collection(db, "groups", nestedLocation.groupId, "stacks", stackId, "species"),
    );
    for (const speciesDoc of speciesSnapshot.docs) {
      await deleteSpecies(speciesDoc.id, {
        groupId: nestedLocation.groupId,
        stackId,
      });
    }
    await deleteDoc(doc(db, "groups", nestedLocation.groupId, "stacks", stackId));
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
    const species = await getSpecies(stackId, { includeHidden: true });
    for (const speciesItem of species) {
      await deleteSpecies(speciesItem.id);
    }
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

/** Update species ordering under a stack. */
export async function updateStackSpeciesOrder(
  stackId: string,
  speciesIds: string[],
): Promise<void> {
  const stack = await getStack(stackId, { includeHidden: true });
  const nestedLocation = await resolveNestedStackLocation(stackId);
  const batch = writeBatch(db);
  for (let index = 0; index < speciesIds.length; index += 1) {
    const speciesId = speciesIds[index];
    const nestedSpeciesLocation = await resolveNestedSpeciesLocation(speciesId);
    const targetRef =
      nestedSpeciesLocation && nestedLocation
        ? doc(
            db,
            "groups",
            nestedLocation.groupId,
            "stacks",
            stackId,
            "species",
            speciesId,
          )
        : doc(db, "species", speciesId);
    batch.update(targetRef, {
      speciesId,
      parentStackId: stackId,
      parentGroupId: stack?.parentGroupId ?? null,
      order: index,
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
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
      const statuses = await getPinkkaGroupImportStateMap(ids);

      for (const [id, resolvers] of entries) {
        const value = statuses[id] ?? NOT_IMPORTED_STATUS;
        resolvers.forEach((resolver) => resolver(value));
      }
    }, 0);
  });
}

/** Check if a Pinkka group id already exists in Firestore. */
export async function isPinkkaGroupImported(
  groupId: number,
): Promise<boolean> {
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

      const statusesByGroup = new Map<number, Record<number, PinkkaImportStatus>>();
      await Promise.all(
        [...idsByGroup.entries()].map(async ([groupId, stackIds]) => {
          const statuses = await getPinkkaStackImportStateMap(groupId, stackIds);
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

      const statusesByParent = new Map<string, Record<number, PinkkaImportStatus>>();
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
 * Import a Pinkka group with its stacks and species into Firestore under
 * the pinkka hierarchy.
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
  void ownerId;
  void options?.upsert;
  const forceImport = options?.force === true;
  assertPinkkaImportNotInterrupted(options?.progressContext);
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;

  if (!forceImport) {
    const groupStatusMap = await getPinkkaGroupImportStateMap([groupId]);
    const groupStatus = groupStatusMap[groupId];
    if (
      groupStatus?.isImported === true &&
      groupStatus.isIncomplete !== true
    ) {
      return null;
    }
  }

  const group = await fetchPinkkaGroupWithStacks(groupId);
  if (!group) return null;
  const groupName = getPinkkaGroupDisplayName(group);
  updateCurrentEntityProgress(options?.progressContext, "groups", groupName);

  const stackEntries = [...(group.subPinkkas ?? [])].sort(
    (a, b) => a.orderNo - b.orderNo,
  );
  const stackStatusById = forceImport
    ? null
    : await getPinkkaStackImportStateMap(
        group.id,
        stackEntries.map((stack) => stack.id),
      );
  const importableStackEntries = stackEntries.filter(
    (stack) =>
      stackStatusById === null ||
      stackStatusById[stack.id]?.isImported !== true ||
      stackStatusById[stack.id]?.isIncomplete === true,
  );
  if (options?.progressContext?.mode === "groups") {
    options.progressContext.progress.stacks.total += importableStackEntries.length;
    emitPinkkaImportProgress(options.progressContext);
  }
  const stackIds = importableStackEntries.map((stack) => String(stack.id));
  const speciesIds: string[] = [];

  await markPinkkaGroupImportStarted(group.id);
  await writePinkkaEntity(getPinkkaGroupPath(group.id), group);

  for (const stackEntry of importableStackEntries) {
    assertPinkkaImportNotInterrupted(options?.progressContext);
    const stackDetail = await fetchPinkkaSubStack(stackEntry.id);
    const stackData = stackDetail ?? stackEntry;
    await markPinkkaStackImportStarted(group.id, stackData.id);
    const stackSpeciesCards = stackData.speciesCards ?? [];
    const speciesStatusById = forceImport
      ? null
      : await getPinkkaSpeciesImportStateMap(
          group.id,
          stackData.id,
          stackSpeciesCards.map((card) => card.id),
        );
    const importableSpeciesCards = stackSpeciesCards.filter(
      (card) =>
        speciesStatusById === null ||
        speciesStatusById[card.id]?.isImported !== true ||
        speciesStatusById[card.id]?.isIncomplete === true,
    );
    const stackName = getPinkkaStackDisplayName(stackData);
    updateCurrentEntityProgress(
      options?.progressContext,
      "stacks",
      stackName,
      stackData.image ? 1 : 0,
    );
    if (options?.progressContext?.mode === "groups") {
      options.progressContext.progress.species.total +=
        importableSpeciesCards.length;
      emitPinkkaImportProgress(options.progressContext);
    }

    await storePinkkaStackImage(
      stackData.id,
      stackData,
      options?.progressContext,
      forceImport,
    );
    await writePinkkaEntity(
      getPinkkaStackPath(group.id, stackData.id),
      stackData,
    );

    for (const card of importableSpeciesCards) {
      assertPinkkaImportNotInterrupted(options?.progressContext);
      await markPinkkaSpeciesImportStarted(group.id, stackData.id, card.id);
      const speciesDetail = await fetchPinkkaSpecies(card.id);
      if (!speciesDetail) continue;
      const speciesName = getPinkkaSpeciesDisplayName(card.id, speciesDetail);
      updateCurrentEntityProgress(
        options?.progressContext,
        "species",
        speciesName,
        speciesDetail.images?.length ?? 0,
      );
      await storePinkkaSpeciesImages(
        card.id,
        speciesDetail,
        options?.progressContext,
        forceImport,
      );
      await writePinkkaEntity(
        getPinkkaSpeciesPath(group.id, stackData.id, card.id),
        speciesDetail,
      );
      await markPinkkaSpeciesImportCompleted(group.id, stackData.id, card.id);
      speciesIds.push(String(card.id));
      if (options?.progressContext) {
        options.progressContext.progress.species.completed += 1;
        emitPinkkaImportProgress(options.progressContext);
      }
    }

    await markPinkkaStackImportCompleted(group.id, stackData.id);
    markStackCompleted(options?.progressContext, group.id, stackData.id, stackName);
  }
  await markPinkkaGroupImportCompleted(group.id);
  markGroupCompleted(options?.progressContext, group.id, groupName);

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
  options?: {
    importId?: string;
    upsert?: boolean;
    groupId?: number;
    progressContext?: PinkkaImportProgressContext;
    force?: boolean;
  },
): Promise<PinkkaImportResult | null> {
  void ownerId;
  void options?.upsert;
  const forceImport = options?.force === true;
  assertPinkkaImportNotInterrupted(options?.progressContext);
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  const stackDetail = await fetchPinkkaSubStack(stackId);
  if (!stackDetail) return null;
  const resolvedGroupId =
    options?.groupId ?? (await resolveGroupIdForStack(stackId, stackDetail));
  if (resolvedGroupId === null) return null;
  if (!forceImport) {
    const stackStatusMap = await getPinkkaStackImportStateMap(resolvedGroupId, [
      stackId,
    ]);
    const stackStatus = stackStatusMap[stackId];
    if (
      stackStatus?.isImported === true &&
      stackStatus.isIncomplete !== true
    ) {
      return null;
    }
  }

  await markPinkkaGroupImportStarted(resolvedGroupId);
  await markPinkkaStackImportStarted(resolvedGroupId, stackDetail.id);
  const hierarchy = await writePinkkaGroupAndStackHierarchy({
    groupId: resolvedGroupId,
    stackId: stackDetail.id,
    stackEntity: stackDetail,
  });
  if (!hierarchy) return null;
  const groupName = getPinkkaGroupDisplayName(hierarchy.group);
  markGroupCompleted(options?.progressContext, resolvedGroupId, groupName);

  const speciesIds: string[] = [];
  const stackSpeciesCards = hierarchy.stack.speciesCards ?? [];
  const speciesStatusById = forceImport
    ? null
    : await getPinkkaSpeciesImportStateMap(
        resolvedGroupId,
        hierarchy.stack.id,
        stackSpeciesCards.map((card) => card.id),
      );
  const importableSpeciesCards = stackSpeciesCards.filter(
    (card) =>
      speciesStatusById === null ||
      speciesStatusById[card.id]?.isImported !== true ||
      speciesStatusById[card.id]?.isIncomplete === true,
  );
  const stackName = getPinkkaStackDisplayName(hierarchy.stack);
  updateCurrentEntityProgress(
    options?.progressContext,
    "stacks",
    stackName,
    hierarchy.stack.image ? 1 : 0,
  );
  if (options?.progressContext?.mode === "stacks") {
    options.progressContext.progress.species.total +=
      importableSpeciesCards.length;
    emitPinkkaImportProgress(options.progressContext);
  }

  await storePinkkaStackImage(
    hierarchy.stack.id,
    hierarchy.stack,
    options?.progressContext,
    forceImport,
  );
  markStackCompleted(
    options?.progressContext,
    resolvedGroupId,
    hierarchy.stack.id,
    stackName,
  );
  for (const card of importableSpeciesCards) {
    assertPinkkaImportNotInterrupted(options?.progressContext);
    await markPinkkaSpeciesImportStarted(
      resolvedGroupId,
      hierarchy.stack.id,
      card.id,
    );
    const speciesDetail = await fetchPinkkaSpecies(card.id);
    if (!speciesDetail) continue;
    const speciesName = getPinkkaSpeciesDisplayName(card.id, speciesDetail);
    updateCurrentEntityProgress(
      options?.progressContext,
      "species",
      speciesName,
      speciesDetail.images?.length ?? 0,
    );
    await storePinkkaSpeciesImages(
      card.id,
      speciesDetail,
      options?.progressContext,
      forceImport,
    );
    await writePinkkaEntity(
      getPinkkaSpeciesPath(resolvedGroupId, hierarchy.stack.id, card.id),
      speciesDetail,
    );
    speciesIds.push(String(card.id));
    await markPinkkaSpeciesImportCompleted(
      resolvedGroupId,
      hierarchy.stack.id,
      card.id,
    );
    if (options?.progressContext) {
      options.progressContext.progress.species.completed += 1;
      emitPinkkaImportProgress(options.progressContext);
    }
  }

  await markPinkkaStackImportCompleted(resolvedGroupId, hierarchy.stack.id);
  await markPinkkaGroupImportCompleted(resolvedGroupId);

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
  options?: {
    groupId?: number;
    onProgress?: PinkkaImportProgressCallback;
    shouldInterrupt?: () => boolean;
    force?: boolean;
  },
): Promise<PinkkaImportResult[]> {
  const resolvedImportId =
    importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];
  const forceImport = options?.force === true;
  const stackStateById =
    !forceImport && options?.groupId !== undefined
      ? await getPinkkaStackImportStateMap(options.groupId, stackIds)
      : null;
  const filteredStackIds =
    stackStateById === null
      ? stackIds
      : stackIds.filter(
          (stackId) =>
            stackStateById[stackId]?.isImported !== true ||
            stackStateById[stackId]?.isIncomplete === true,
        );
  const progressContext = createPinkkaImportProgressContext({
    mode: "stacks",
    onProgress: options?.onProgress,
    shouldInterrupt: options?.shouldInterrupt,
    initialProgress: {
      groups: {
        total: options?.groupId !== undefined ? 1 : 0,
      },
      stacks: {
        total: filteredStackIds.length,
      },
    },
  });
  emitPinkkaImportProgress(progressContext);

  for (const stackId of filteredStackIds) {
    assertPinkkaImportNotInterrupted(progressContext);
    const result = await importPinkkaStack(
      stackId,
      ownerId,
      {
        importId: resolvedImportId,
        upsert: shouldUpsert,
        groupId: options?.groupId,
        progressContext,
        force: forceImport,
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
    progressContext?: PinkkaImportProgressContext;
    force?: boolean;
  },
): Promise<PinkkaImportResult | null> {
  void ownerId;
  void options?.upsert;
  const forceImport = options?.force === true;
  assertPinkkaImportNotInterrupted(options?.progressContext);
  const resolvedImportId =
    options?.importId ?? doc(collection(db, "imports")).id;
  const speciesDetail = await fetchPinkkaSpecies(speciesId);
  if (!speciesDetail) return null;
  const speciesLocation =
    options?.groupId !== undefined && options?.stackId !== undefined
      ? { groupId: options.groupId, stackId: options.stackId }
      : await resolveSpeciesLocation(speciesId);
  if (!speciesLocation) return null;
  if (!forceImport) {
    const speciesStatusMap = await getPinkkaSpeciesImportStateMap(
      speciesLocation.groupId,
      speciesLocation.stackId,
      [speciesId],
    );
    const speciesStatus = speciesStatusMap[speciesId];
    if (
      speciesStatus?.isImported === true &&
      speciesStatus.isIncomplete !== true
    ) {
      return null;
    }
  }

  await markPinkkaGroupImportStarted(speciesLocation.groupId);
  await markPinkkaStackImportStarted(
    speciesLocation.groupId,
    speciesLocation.stackId,
  );
  await markPinkkaSpeciesImportStarted(
    speciesLocation.groupId,
    speciesLocation.stackId,
    speciesId,
  );
  const hierarchy = await writePinkkaGroupAndStackHierarchy({
    groupId: speciesLocation.groupId,
    stackId: speciesLocation.stackId,
  });
  if (!hierarchy) return null;
  const groupName = getPinkkaGroupDisplayName(hierarchy.group);
  markGroupCompleted(options?.progressContext, hierarchy.group.id, groupName);
  const stackName = getPinkkaStackDisplayName(hierarchy.stack);
  updateCurrentEntityProgress(
    options?.progressContext,
    "stacks",
    stackName,
    hierarchy.stack.image ? 1 : 0,
  );
  await storePinkkaStackImage(
    hierarchy.stack.id,
    hierarchy.stack,
    options?.progressContext,
    forceImport,
  );
  markStackCompleted(
    options?.progressContext,
    hierarchy.group.id,
    hierarchy.stack.id,
    stackName,
  );
  const speciesName = getPinkkaSpeciesDisplayName(speciesId, speciesDetail);
  updateCurrentEntityProgress(
    options?.progressContext,
    "species",
    speciesName,
    speciesDetail.images?.length ?? 0,
  );
  await storePinkkaSpeciesImages(
    speciesId,
    speciesDetail,
    options?.progressContext,
    forceImport,
  );
  await writePinkkaEntity(
    getPinkkaSpeciesPath(
      speciesLocation.groupId,
      speciesLocation.stackId,
      speciesId,
    ),
    speciesDetail,
  );
  await markPinkkaSpeciesImportCompleted(
    speciesLocation.groupId,
    speciesLocation.stackId,
    speciesId,
  );
  await markPinkkaStackImportCompleted(
    speciesLocation.groupId,
    speciesLocation.stackId,
  );
  await markPinkkaGroupImportCompleted(speciesLocation.groupId);
  if (options?.progressContext) {
    options.progressContext.progress.species.completed += 1;
    emitPinkkaImportProgress(options.progressContext);
  }

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
  options?: {
    groupId?: number;
    stackId?: number;
    onProgress?: PinkkaImportProgressCallback;
    shouldInterrupt?: () => boolean;
    force?: boolean;
  },
): Promise<PinkkaImportResult[]> {
  const resolvedImportId =
    importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];
  const forceImport = options?.force === true;
  const speciesStatusById =
    !forceImport &&
    options?.groupId !== undefined &&
    options?.stackId !== undefined
      ? await getPinkkaSpeciesImportStateMap(
          options.groupId,
          options.stackId,
          speciesIds,
        )
      : null;
  const filteredSpeciesIds =
    speciesStatusById === null
      ? speciesIds
      : speciesIds.filter(
          (speciesId) =>
            speciesStatusById[speciesId]?.isImported !== true ||
            speciesStatusById[speciesId]?.isIncomplete === true,
        );
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
        total: filteredSpeciesIds.length,
      },
    },
  });
  emitPinkkaImportProgress(progressContext);

  for (const speciesId of filteredSpeciesIds) {
    assertPinkkaImportNotInterrupted(progressContext);
    const result = await importPinkkaSpecies(
      speciesId,
      ownerId,
      {
        importId: resolvedImportId,
        upsert: shouldUpsert,
        groupId: options?.groupId,
        stackId: options?.stackId,
        progressContext,
        force: forceImport,
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
  options?: PinkkaImportControlOptions,
): Promise<PinkkaImportResult[]> {
  const resolvedImportId =
    importId ?? doc(collection(db, "imports")).id;
  const shouldUpsert = Boolean(importId);
  const results: PinkkaImportResult[] = [];
  const forceImport = options?.force === true;
  const groupStatusById = forceImport
    ? null
    : await getPinkkaGroupImportStateMap(groupIds);
  const filteredGroupIds =
    groupStatusById === null
      ? groupIds
      : groupIds.filter(
          (groupId) =>
            groupStatusById[groupId]?.isImported !== true ||
            groupStatusById[groupId]?.isIncomplete === true,
        );
  const progressContext = createPinkkaImportProgressContext({
    mode: "groups",
    onProgress: options?.onProgress,
    shouldInterrupt: options?.shouldInterrupt,
    initialProgress: {
      groups: {
        total: filteredGroupIds.length,
      },
    },
  });
  emitPinkkaImportProgress(progressContext);

  for (const groupId of filteredGroupIds) {
    assertPinkkaImportNotInterrupted(progressContext);
    const result = await importPinkkaGroup(
      groupId,
      ownerId,
      {
        importId: resolvedImportId,
        upsert: shouldUpsert,
        progressContext,
        force: forceImport,
      },
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
  const parentStackId = species.parentStackId ?? stackIds[0];
  if (!parentStackId) {
    throw new Error("A parent stack id is required when creating a species.");
  }

  const parentStack = await getStack(parentStackId, { includeHidden: true });
  const nestedStackLocation = await resolveNestedStackLocation(parentStackId);
  const siblingSpecies = await getSpecies(parentStackId, { includeHidden: true });
  const parentGroupId =
    species.parentGroupId ?? nestedStackLocation?.groupId ?? parentStack?.parentGroupId;

  const speciesId = buildUrnId("species");
  const speciesRef =
    nestedStackLocation && parentGroupId
      ? doc(
          db,
          "groups",
          parentGroupId,
          "stacks",
          parentStackId,
          "species",
          speciesId,
        )
      : doc(db, "species", speciesId);
  const now = Timestamp.now();
  const newSpecies = {
    ...species,
    speciesId,
    parentStackId,
    parentGroupId,
    order: species.order ?? siblingSpecies.length,
    isHidden: species.isHidden ?? false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(speciesRef, newSpecies);
  return speciesId;
}

/** Fetch species, optionally filtered by stack and visibility. */
export async function getSpecies(
  stackId?: string,
  options?: { includeHidden?: boolean },
): Promise<Species[]> {
  const includeHidden = options?.includeHidden ?? false;
  if (stackId) {
    const nestedStackLocation = await resolveNestedStackLocation(stackId);
    if (nestedStackLocation) {
      const parentGroupDoc = await getDoc(
        doc(db, "groups", nestedStackLocation.groupId),
      );
      if (!parentGroupDoc.exists()) return [];
      if (!includeHidden && parentGroupDoc.data().isHidden) return [];

      const nestedStack = toStackFromDoc(nestedStackLocation.doc);
      if (!includeHidden && nestedStack.isHidden) return [];

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
        speciesSnapshot.docs.map((docSnapshot) => toSpeciesFromDoc(docSnapshot)),
      );
      return includeHidden ? species : species.filter((item) => !item.isHidden);
    }

    const stackDoc = await getDoc(doc(db, "stacks", stackId));
    if (!stackDoc.exists()) return [];
    if (!includeHidden && stackDoc.data().isHidden) return [];

    const hierarchicalSnapshot = await getDocs(
      query(collection(db, "species"), where("parentStackId", "==", stackId)),
    );
    let species = sortByOrder(
      hierarchicalSnapshot.docs.map((docSnapshot) =>
        toSpeciesFromDoc(docSnapshot),
      ),
    );

    // Legacy fallback for historical stacks linked only with speciesIds arrays.
    if (species.length === 0) {
      const legacySpeciesIds = (stackDoc.data().speciesIds ?? []) as string[];
      if (legacySpeciesIds.length > 0) {
        const speciesDocs = await Promise.all(
          legacySpeciesIds.map((id) => getDoc(doc(db, "species", id))),
        );
        species = sortByOrder(
          speciesDocs
            .filter((speciesDoc) => speciesDoc.exists())
            .map((speciesDoc) => toSpeciesFromDoc(speciesDoc)),
        );
      }
    }

    return includeHidden ? species : species.filter((item) => !item.isHidden);
  }

  const mergedById = new Map<string, Species>();

  const stacks = await getStacks(undefined, undefined, { includeHidden: true });
  for (const stack of stacks) {
    try {
      const stackSpecies = await getSpecies(stack.id, { includeHidden: true });
      for (const species of stackSpecies) {
        mergedById.set(species.id, species);
      }
    } catch (error) {
      console.error(`Failed to fetch species for stack ${stack.id}`, error);
    }
  }

  const legacySnapshot = await getDocs(query(collection(db, "species")));
  for (const docSnapshot of legacySnapshot.docs) {
    if (mergedById.has(docSnapshot.id)) {
      continue;
    }
    mergedById.set(docSnapshot.id, toSpeciesFromDoc(docSnapshot));
  }
  const species = sortByOrder([...mergedById.values()]);
  return includeHidden ? species : species.filter((item) => !item.isHidden);
}

/** Fetch a single species by id. */
export async function getSpeciesById(
  speciesId: string,
): Promise<Species | null> {
  const nestedLocation = await resolveNestedSpeciesLocation(speciesId);
  if (nestedLocation) {
    return toSpeciesFromDoc(nestedLocation.doc);
  }

  const speciesDoc = await getDoc(doc(db, "species", speciesId));
  if (!speciesDoc.exists()) return null;
  return toSpeciesFromDoc(speciesDoc);
}

/** Update a species with partial fields. */
export async function updateSpecies(
  speciesId: string,
  updates: Partial<Species>,
): Promise<void> {
  const nestedLocation = await resolveNestedSpeciesLocation(speciesId);
  const targetRef = nestedLocation
    ? doc(
        db,
        "groups",
        nestedLocation.groupId,
        "stacks",
        nestedLocation.stackId,
        "species",
        speciesId,
      )
    : doc(db, "species", speciesId);
  await updateDoc(targetRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a species and its stored images. */
export async function deleteSpecies(
  speciesId: string,
  options?: { groupId?: string; stackId?: string },
): Promise<void> {
  let nestedLocation: ResolvedSpeciesLocation | null = null;
  if (options?.groupId && options?.stackId) {
    const nestedSpeciesDoc = await getDoc(
      doc(
        db,
        "groups",
        options.groupId,
        "stacks",
        options.stackId,
        "species",
        speciesId,
      ),
    );
    if (nestedSpeciesDoc.exists()) {
      nestedLocation = {
        groupId: options.groupId,
        stackId: options.stackId,
        speciesId: nestedSpeciesDoc.id,
        doc: nestedSpeciesDoc as FirestoreDocLike & { ref: ReturnType<typeof doc> },
      };
    }
  }

  if (!nestedLocation) {
    nestedLocation = await resolveNestedSpeciesLocation(speciesId);
  }

  const speciesDoc = nestedLocation
    ? await getDoc(
        doc(
          db,
          "groups",
          nestedLocation.groupId,
          "stacks",
          nestedLocation.stackId,
          "species",
          speciesId,
        ),
      )
    : await getDoc(doc(db, "species", speciesId));

  if (speciesDoc.exists()) {
    const speciesData = speciesDoc.data();
    let isLinkedToPinkka = Boolean(speciesData.pinkkaRef);

    if (!isLinkedToPinkka && nestedLocation) {
      const nestedStackDoc = await getDoc(
        doc(db, "groups", nestedLocation.groupId, "stacks", nestedLocation.stackId),
      );
      const nestedGroupDoc = await getDoc(doc(db, "groups", nestedLocation.groupId));
      isLinkedToPinkka =
        Boolean(nestedStackDoc.data()?.pinkkaRef) ||
        Boolean(nestedGroupDoc.data()?.pinkkaRef);
    }

    // Legacy unlink for historical stacks still using speciesIds arrays.
    const stackQuery = query(
      collection(db, "stacks"),
      where("speciesIds", "array-contains", speciesId),
    );
    const stackSnapshot = await getDocs(stackQuery);
    if (!isLinkedToPinkka) {
      isLinkedToPinkka = stackSnapshot.docs.some((stackDoc) =>
        Boolean(stackDoc.data().pinkkaRef),
      );
    }

    if (!isLinkedToPinkka) {
      // Only local content images are removed. Pinkka-linked images remain.
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

    for (const stackDoc of stackSnapshot.docs) {
      const speciesIds = stackDoc.data().speciesIds || [];
      await updateDoc(doc(db, "stacks", stackDoc.id), {
        speciesIds: speciesIds.filter((id: string) => id !== speciesId),
        updatedAt: Timestamp.now(),
      });
    }
  }

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

  const legacyDoc = await getDoc(doc(db, "species", speciesId));
  if (legacyDoc.exists()) {
    await deleteDoc(doc(db, "species", speciesId));
  }
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
