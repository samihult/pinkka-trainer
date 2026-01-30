import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names with Tailwind-aware conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Log Firestore-related errors with a consistent prefix. */
export function logFirestoreError(context: string, error: unknown): void {
  console.error(`[Firestore] ${context}`, error);
}
