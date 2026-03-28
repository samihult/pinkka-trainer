/** Shared domain types for auth, learning, and content entities. */
/** Supported application roles. */
export type UserRole = "viewer" | "editor" | "admin";

/** Test presentation mode. */
export type TestMode = "multiple-choice" | "write-name";

/** Test session flow mode. */
export type TestSessionMode = "fixed-round" | "until-correct";

/** @deprecated Legacy accepted-answer setting kept for preference migration. */
export type LegacyTestAnswerMode = "scientific" | "vernacular" | "either";

/** Accepted answer scope used by test sessions. */
export type TestAnswerScope = "species" | "genus" | "family";

/** Accepted answer name variant used by test sessions. */
export type TestAnswerNameMode = "scientific" | "vernacular" | "either";

/** @deprecated Legacy alias kept for backward-compatible import paths. */
export type TestAnswerMode = TestAnswerNameMode;

/** Name variants tracked for learning progress (including legacy values). */
export type LearningNameType = TestAnswerScope | TestAnswerNameMode;

/** Learning status buckets for histogram summaries. */
export type LearningStatusCategory =
  | "new"
  | "learning"
  | "strengthening"
  | "mastered";

/** Thresholds for mapping a retention score to a verbal learning label. */
export interface LearningStatusThresholds {
  /** Upper bound for the "Learning" label. */
  learningMax: number;
  /** Upper bound for the "Strengthening" label. */
  strengtheningMax: number;
}

/** Count + percentage for a learning-status bucket. */
export interface LearningStatusBucket {
  /** Number of species in the bucket. */
  count: number;
  /** Percentage (0-100) of species in the bucket. */
  percent: number;
}

/** Histogram summary for learning-status buckets. */
export interface LearningStatusHistogram {
  /** Total species counted for the histogram. */
  total: number;
  /** Bucket for species with no learning data. */
  new: LearningStatusBucket;
  /** Bucket for species in the learning stage. */
  learning: LearningStatusBucket;
  /** Bucket for species in the strengthening stage. */
  strengthening: LearningStatusBucket;
  /** Bucket for species in the mastered stage. */
  mastered: LearningStatusBucket;
}

/** Stored learning stability state for a specific name variant. */
export interface LearningProgressState {
  /** Stability half-life in days for the accuracy curve. */
  accuracyStabilityDays: number;
  /** Stability half-life in days for the speed curve. */
  speedStabilityDays: number;
  /** Timestamp of the last review. */
  lastReviewedAt: Date;
  /** Total number of reviews recorded. */
  reviewCount: number;
  /** Exponentially smoothed response time in milliseconds. */
  averageResponseMs: number;
}

/** Learning progress document stored in Firestore. */
export interface LearningProgress extends LearningProgressState {
  /** Firestore document id. */
  id: string;
  /** UID of the learner. */
  userId: string;
  /** Species document id. */
  speciesId: string;
  /** Parent stack id used for aggregate progress updates. */
  parentStackId?: string;
  /** Parent group id used for aggregate progress updates. */
  parentGroupId?: string;
  /** Name variant that is being tracked. */
  nameType: LearningNameType;
}

/** Base progress summary for mastered scientific names at one scope. */
export interface ScientificProgressSummary {
  /** Firestore document id. */
  id: string;
  /** UID of the learner. */
  userId: string;
  /** Count of mastered scientific names in the scope. */
  masteredScientificCount: number;
  /** Total visible species count in the scope. */
  totalSpeciesCount: number;
  /** Mastered scientific-name percentage in the scope. */
  masteredScientificPercent: number;
  /** Last aggregate update timestamp. */
  updatedAt: Date;
}

/** User progress summary cached per stack. */
export interface StackScientificProgress extends ScientificProgressSummary {
  /** Stack document id. */
  stackId: string;
  /** Parent group id when available. */
  groupId?: string;
}

/** User progress summary cached per group. */
export interface GroupScientificProgress extends ScientificProgressSummary {
  /** Group document id. */
  groupId: string;
}

/** User progress summary cached globally across visible species. */
export interface GlobalScientificProgress extends ScientificProgressSummary {}

/** Histogram summary stored per user and stack. */
export interface StackLearningHistogram {
  /** Firestore document id. */
  id: string;
  /** UID of the learner. */
  userId: string;
  /** Stack document id. */
  stackId: string;
  /** Species-name histogram (scientific/vernacular answers). */
  species: LearningStatusHistogram;
  /** Genus-name histogram. */
  genus: LearningStatusHistogram;
  /** Family-name histogram. */
  family: LearningStatusHistogram;
  /** Last update timestamp. */
  updatedAt: Date;
}

/** Test configuration stored in user preferences. */
export interface TestPreferences {
  /** Number of questions to include in each test session (0 means all). */
  questionCount: number;
  /** Test interaction mode. */
  mode: TestMode;
  /** Session flow mode controlling completion and retries. */
  sessionMode: TestSessionMode;
  /** Required answer scope for tests. */
  answerScope: TestAnswerScope;
  /** Required answer name variant for tests. */
  answerNameMode: TestAnswerNameMode;
}

/** Home-page collection preferences stored in the user profile. */
export interface HomePreferences {
  /** Group ids marked as favorites by the current user. */
  favoriteGroupIds: string[];
  /** Stack ids marked as favorites by the current user. */
  favoriteStackIds: string[];
}

/** User-specific preferences stored with the profile. */
export interface UserPreferences {
  /** Test settings used when starting a new test. */
  test?: TestPreferences;
  /** Home-page collection preferences. */
  home?: HomePreferences;
}

/** Authenticated user profile. */
export interface User {
  /** Firebase auth uid. */
  uid: string;
  /** User email address when available. */
  email?: string;
  /** Whether the current account is anonymous. */
  isAnonymous?: boolean;
  /** Role used for authorization. */
  role: UserRole;
  /** Optional display name. */
  displayName?: string;
  /** Account creation timestamp. */
  createdAt: Date;
  /** Optional user preferences. */
  preferences?: UserPreferences;
}

/** Localized text map keyed by language code. */
export interface LocalizedText {
  /** Finnish translation. */
  fi?: string;
  /** English translation. */
  en?: string;
  /** Swedish translation. */
  sv?: string;
}

/** Generic source snapshot preserved alongside editable merged content. */
export interface ContentSourceRecord<T> {
  /** Source-system discriminator such as `pinkka`. */
  source: string;
  /** Source entity category such as `species`. */
  entityType: string;
  /** Stable source-side identifier. */
  externalId: string;
  /** Original source payload mapped into app content shape. */
  data: T;
  /** Optional source metadata useful for later merges. */
  metadata?: Record<string, string | number | boolean | null>;
}

/** Multilingual identification hint with an optional referenced species image. */
export interface SpeciesIdentificationHint {
  /** Stable hint id used for reliable updates in clients. */
  id: string;
  /** Localized hint text content. */
  text: LocalizedText;
  /** Optional referenced species image id for hint visuals. */
  imageId?: string;
}

/** Image metadata for a species detail entry. */
export interface SpeciesImage {
  /** Image id. */
  id: string;
  /** Optional localized image caption. */
  caption?: LocalizedText;
  /** Optional taxonomy id for the image. */
  taxonId?: string | null;
  /** Image URLs at various sizes. */
  urls?: {
    /** Original image URL. */
    original?: string;
    /** Full-size image URL. */
    full?: string;
    /** Large image URL. */
    large?: string;
    /** Square-cropped image URL. */
    square?: string;
    /** Thumbnail image URL. */
    thumbnail?: string;
  };
  /** Optional metadata about the image. */
  meta?: {
    /** Rights owner for the image. */
    rightsOwner?: string;
    /** Capturers/photographers for the image. */
    capturers?: string[];
    /** License identifier for the image. */
    license?: string;
  };
}

/** Image metadata for group/stack level entities. */
export interface EntityImage {
  /** Image id. */
  id: string;
  /** Image URLs at various sizes. */
  urls?: {
    /** Original image URL. */
    original?: string;
    /** Full-size image URL. */
    full?: string;
    /** Large image URL. */
    large?: string;
    /** Square-cropped image URL. */
    square?: string;
    /** Thumbnail image URL. */
    thumbnail?: string;
  };
}

/** Taxonomy node stored on a species document. */
export interface SpeciesTaxonomyNode {
  /** Taxonomy id for this taxonomy node. */
  taxonId: string;
  /** Optional localized common names for this taxonomy node. */
  vernacularName?: LocalizedText | null;
  /** Scientific name for this taxonomy node. */
  scientificName: string;
  /** Optional localized rank display names. */
  rankName?: LocalizedText;
  /** Rank identifier (for example `MX.family` or `MX.genus`). */
  rank?: string;
}

/** Descriptive section stored on a species document. */
export interface SpeciesDescriptionSection {
  /** Localized section title. */
  title: LocalizedText;
  /** Localized section body. */
  body: LocalizedText;
  /** Optional section predicate identifier. */
  predicate?: string;
}

/** Core learning-item content used by cards, tests, and source merges. */
export interface LearningItemData {
  /** Taxonomy id for the species. */
  taxonId: string;
  /** Scientific species name. */
  scientificName: string;
  /** Optional scientific genus label used by genus-scope tests. */
  genusScientificName?: string;
  /** Optional localized genus common names used by genus tests. */
  genusVernacularName?: LocalizedText;
  /** Optional scientific family label used by family-scope tests. */
  familyScientificName?: string;
  /** Optional localized family common names used by family tests. */
  familyVernacularName?: LocalizedText;
  /** Optional taxonomy chain copied from external source data. */
  taxonomy?: SpeciesTaxonomyNode[];
  /** Optional localized common names. */
  vernacularName?: LocalizedText;
  /** Optional descriptive sections. */
  description?: SpeciesDescriptionSection[];
  /** Optional species images stored in Firebase Storage. */
  images?: SpeciesImage[];
  /** Optional localized identification hints shown in learning view. */
  identificationHints?: SpeciesIdentificationHint[];
  /** @deprecated Legacy plain-text hints kept for backward compatibility. */
  identificationTips?: string[];
}

/** Core stack content used by cards, tests, and source merges. */
export interface StackData {
  /** Localized stack name. */
  name: LocalizedText;
  /** Optional localized stack description. */
  description?: LocalizedText;
  /** Optional stack images stored in Firebase Storage. */
  images?: SpeciesImage[];
}

/** Core group content used by cards and source merges. */
export interface GroupData {
  /** Localized group name. */
  name: LocalizedText;
  /** Optional localized group description. */
  description?: LocalizedText;
}

/** Canonical learning-item document stored in Firestore. */
export interface LearningItem {
  /** Learning-item document id. */
  id: string;
  /** @deprecated Legacy parent group id kept for migration compatibility. */
  parentGroupId?: string;
  /** @deprecated Legacy parent stack id kept for migration compatibility. */
  parentStackId?: string;
  /** Core learning-item content used by cards and tests. */
  data: LearningItemData;
  /** Optional preserved source snapshots for generic source-aware merging. */
  sourceRecords?: ContentSourceRecord<LearningItemData>[];
  /** Generic source lookup keys derived from source records. */
  sourceKeys?: string[];
  /** Optional manual edits layered on top of source snapshots. */
  manualOverrides?: Partial<LearningItemData>;
  /** Optional link back to imported Pinkka entity ids. */
  pinkkaRef?: {
    /** @deprecated Legacy linked Pinkka group id kept for compatibility. */
    groupId?: number;
    /** @deprecated Legacy linked Pinkka stack id kept for compatibility. */
    stackId?: number;
    /** Stable linked Pinkka species id. */
    speciesId: number;
  };
  /** Image ids enabled for tests; defaults to all images when unset. */
  testImageIds?: string[];
  /** Optional order index within the parent stack. */
  order?: number;
  /** Whether the species is hidden from learners. */
  isHidden?: boolean;
  /** Optional import batch id for grouping. */
  importId?: string;
  /** UID of the creator for access control. */
  ownerId: string;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
}

/** @deprecated Use `LearningItemData`; species remains the current biology-facing label in the UI. */
export type SpeciesData = LearningItemData;

/** @deprecated Use `LearningItem`; species remains the current biology-facing label in the UI. */
export type Species = LearningItem;

/** Stack document stored in Firestore. */
export interface Stack {
  /** Stack document id. */
  id: string;
  /** Parent group id. */
  parentGroupId?: string;
  /** Core stack content used by cards and tests. */
  data: StackData;
  /** Optional preserved source snapshots for generic source-aware merging. */
  sourceRecords?: ContentSourceRecord<StackData>[];
  /** Generic source lookup keys derived from source records. */
  sourceKeys?: string[];
  /** Optional manual edits layered on top of source snapshots. */
  manualOverrides?: Partial<StackData>;
  /** Optional link back to imported Pinkka entity ids. */
  pinkkaRef?: {
    /** Linked Pinkka group id. */
    groupId?: number;
    /** Linked Pinkka stack id. */
    stackId: number;
  };
  /** Optional stack images stored in Firebase Storage. */
  images?: EntityImage[];
  /** Whether the stack is hidden from learners. */
  isHidden?: boolean;
  /** Ordered canonical learning-item ids linked into the stack. */
  learningItemIds?: string[];
  /** @deprecated Legacy ordered species ids in the stack. */
  speciesIds?: string[];
  /** Optional order index within the parent group. */
  order?: number;
  /** Optional import batch id for grouping. */
  importId?: string;
  /** UID of the creator for access control. */
  ownerId: string;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
}

/** Group document stored in Firestore. */
export interface Group {
  /** Group document id. */
  id: string;
  /** Core group content used by cards and tests. */
  data: GroupData;
  /** Optional preserved source snapshots for generic source-aware merging. */
  sourceRecords?: ContentSourceRecord<GroupData>[];
  /** Generic source lookup keys derived from source records. */
  sourceKeys?: string[];
  /** Optional manual edits layered on top of source snapshots. */
  manualOverrides?: Partial<GroupData>;
  /** Optional link back to imported Pinkka group id. */
  pinkkaRef?: {
    /** Linked Pinkka group id. */
    groupId: number;
  };
  /** Optional group images stored in Firebase Storage. */
  images?: EntityImage[];
  /** Whether the group is hidden from learners. */
  isHidden?: boolean;
  /** Legacy stack ids referenced by the group. */
  stackIds?: string[];
  /** Optional import batch id for grouping. */
  importId?: string;
  /** UID of the creator for access control. */
  ownerId: string;
  /** Optional order index within the collection. */
  order?: number;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
}

/** Result record for a test attempt. */
export interface TestResult {
  /** Test result document id. */
  id: string;
  /** UID of the user who took the test. */
  userId: string;
  /** Stack id that was tested. */
  stackId: string;
  /** Number of correct answers. */
  score: number;
  /** Total number of questions. */
  totalQuestions: number;
  /** Completion timestamp. */
  completedAt: Date;
}
