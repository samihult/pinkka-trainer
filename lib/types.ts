export type UserRole = "viewer" | "editor" | "admin"

export interface User {
  uid: string
  email: string
  role: UserRole
  displayName?: string
  createdAt: Date
}

export interface SpeciesImage {
  id: string
  url: string
  order: number
}

export interface Species {
  id: string
  scientificName: string
  finnishName?: string
  englishName?: string
  description?: string
  images: SpeciesImage[]
  stackId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  order: number
}

export interface Stack {
  id: string
  name: string
  description?: string
  groupId: string
  speciesIds: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  order: number
}

export interface Group {
  id: string
  name: string
  description?: string
  stackIds: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  order: number
}

export interface QuizResult {
  id: string
  userId: string
  stackId: string
  score: number
  totalQuestions: number
  completedAt: Date
}
