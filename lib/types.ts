/** Supported application roles. */
export type UserRole = "viewer" | "editor" | "admin";

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
}

/** Image metadata for a species. */
export interface SpeciesImage {
  /** Storage or document id for the image. */
  id: string;
  /** Public URL for the image. */
  url: string;
  /** Sort order within the species. */
  order: number;
}

/** Species metadata stored in the app. */
export interface Species {
  /** Species document id. */
  id: string;
  /** Scientific name of the species. */
  scientificName: string;
  /** Finnish common name. */
  finnishName?: string;
  /** English common name. */
  englishName?: string;
  /** Optional species description. */
  description?: string;
  /** Images associated with the species. */
  images: SpeciesImage[];
  /** Parent stack id. */
  stackId: string;
  /** UID of the creator. */
  createdBy: string;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
  /** Order index within the stack. */
  order: number;
}

/** A collection of related species. */
export interface Stack {
  /** Stack document id. */
  id: string;
  /** Display name for the stack. */
  name: string;
  /** Optional stack description. */
  description?: string;
  /** Parent group id. */
  groupId: string;
  /** Ordered species ids in the stack. */
  speciesIds: string[];
  /** UID of the creator. */
  createdBy: string;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
  /** Order index within the group. */
  order: number;
}

/** A group of stacks. */
export interface Group {
  /** Group document id. */
  id: string;
  /** Display name for the group. */
  name: string;
  /** Optional group description. */
  description?: string;
  /** Ordered stack ids in the group. */
  stackIds: string[];
  /** UID of the creator. */
  createdBy: string;
  /** Creation timestamp. */
  createdAt: Date;
  /** Last update timestamp. */
  updatedAt: Date;
  /** Order index within the collection. */
  order: number;
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
