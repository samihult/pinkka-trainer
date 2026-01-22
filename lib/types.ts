/** Supported application roles. */
export type UserRole = "viewer" | "editor" | "admin";

/** Quiz presentation mode. */
export type QuizMode = "multiple-choice" | "write-name";

/** Accepted answer rules when typing a species name. */
export type QuizAnswerMode = "scientific" | "vernacular" | "either";

/** Name variants tracked for learning progress. */
export type LearningNameType = "scientific" | "vernacular";

/** Thresholds for mapping a retention score to a verbal learning label. */
export interface LearningStatusThresholds {
  /** Upper bound for the "Learning" label. */
  learningMax: number;
  /** Upper bound for the "Strengthening" label. */
  strengtheningMax: number;
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

/** Quiz configuration stored in user preferences. */
export interface QuizPreferences {
  /** Number of questions to include in each quiz session (0 means all). */
  questionCount: number;
  /** Quiz interaction mode. */
  mode: QuizMode;
  /** Required answer type for quizzes. */
  answerMode: QuizAnswerMode;
}

/** User-specific preferences stored with the profile. */
export interface UserPreferences {
  /** Quiz settings used when starting a new quiz. */
  quiz: QuizPreferences;
}

/** Authenticated user profile. */
export interface User {
  /** Firebase auth uid. */
  uid: string;
  /** User email address. */
  email: string;
  /** Role used for authorization. */
  role: UserRole;
  /** Optional display name. */
  displayName?: string;
  /** Account creation timestamp. */
  createdAt: Date;
  /** Optional user preferences. */
  preferences?: UserPreferences;
}

import type {
  MultilingualText,
  PinkkaGroup,
  PinkkaSpeciesDetail,
  PinkkaSubStack,
} from "./pinkka/pinkka-api";

/** Image metadata for a species detail entry. */
export interface SpeciesImage {
  /** Image id. */
  id: string;
  /** Optional localized image caption. */
  caption?: MultilingualText;
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

/** Species document stored in Firestore. */
export interface Species {
  /** Species document id. */
  id: string;
  /** Pinkka species detail payload. */
  data: PinkkaSpeciesDetail;
  /** Image ids enabled for quizzes; defaults to all images when unset. */
  quizImageIds?: string[];
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
  /** Pinkka sub-stack payload. */
  data: PinkkaSubStack;
  /** Whether the stack is hidden from learners. */
  isHidden?: boolean;
  /** Ordered species ids in the stack. */
  speciesIds: string[];
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
  /** Pinkka group payload. */
  data: PinkkaGroup;
  /** Whether the group is hidden from learners. */
  isHidden?: boolean;
  /** Stack ids referenced by the group. */
  stackIds: string[];
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

/** Result record for a quiz attempt. */
export interface QuizResult {
  /** Quiz result document id. */
  id: string;
  /** UID of the user who took the quiz. */
  userId: string;
  /** Stack id that was quizzed. */
  stackId: string;
  /** Number of correct answers. */
  score: number;
  /** Total number of questions. */
  totalQuestions: number;
  /** Completion timestamp. */
  completedAt: Date;
}
