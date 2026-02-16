/** Shared domain types for auth, learning, and content entities. */
/** Supported application roles. */
export type UserRole = "viewer" | "editor" | "admin";

/** Test presentation mode. */
export type TestMode = "multiple-choice" | "write-name";

/** Accepted answer rules when typing a species name. */
export type TestAnswerMode = "scientific" | "vernacular" | "either";

/** Name variants tracked for learning progress. */
export type LearningNameType = "scientific" | "vernacular" | "either";

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
  /** Name variant that is being tracked. */
  nameType: LearningNameType;
}

/** Histogram summary stored per user and stack. */
export interface StackLearningHistogram {
  /** Firestore document id. */
  id: string;
  /** UID of the learner. */
  userId: string;
  /** Stack document id. */
  stackId: string;
  /** Scientific-name histogram. */
  scientific: LearningStatusHistogram;
  /** Vernacular-name histogram. */
  vernacular: LearningStatusHistogram;
  /** Scientific-or-vernacular histogram (used by "either" answer mode). */
  either: LearningStatusHistogram;
  /** Last update timestamp. */
  updatedAt: Date;
}

/** Test configuration stored in user preferences. */
export interface TestPreferences {
  /** Number of questions to include in each test session (0 means all). */
  questionCount: number;
  /** Test interaction mode. */
  mode: TestMode;
  /** Required answer type for tests. */
  answerMode: TestAnswerMode;
}

/** User-specific preferences stored with the profile. */
export interface UserPreferences {
  /** Test settings used when starting a new test. */
  test: TestPreferences;
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

/** Species document stored in Firestore. */
export interface Species {
  /** Species document id. */
  id: string;
  /** Parent group id. */
  parentGroupId?: string;
  /** Parent stack id. */
  parentStackId?: string;
  /** Core species content used by cards and tests. */
  data: {
    /** Taxonomy id for the species. */
    taxonId: string;
    /** Scientific species name. */
    scientificName: string;
    /** Optional localized common names. */
    vernacularName?: LocalizedText;
    /** Optional descriptive sections. */
    description?: Array<{
      /** Localized section title. */
      title: LocalizedText;
      /** Localized section body. */
      body: LocalizedText;
      /** Optional section predicate identifier. */
      predicate?: string;
    }>;
    /** Optional species images stored in Firebase Storage. */
    images?: SpeciesImage[];
  };
  /** Optional link back to imported Pinkka entity ids. */
  pinkkaRef?: {
    /** Linked Pinkka group id. */
    groupId?: number;
    /** Linked Pinkka stack id. */
    stackId?: number;
    /** Linked Pinkka species id. */
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

/** Stack document stored in Firestore. */
export interface Stack {
  /** Stack document id. */
  id: string;
  /** Parent group id. */
  parentGroupId?: string;
  /** Core stack content used by cards and tests. */
  data: {
    /** Localized stack name. */
    name: LocalizedText;
    /** Optional localized stack description. */
    description?: LocalizedText;
    /** Optional stack images stored in Firebase Storage. */
    images?: SpeciesImage[];
  };
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
  /** Legacy ordered species ids in the stack. */
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
  data: {
    /** Localized group name. */
    name: LocalizedText;
    /** Optional localized group description. */
    description?: LocalizedText;
  };
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
