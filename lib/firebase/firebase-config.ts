import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const isStorybook = process.env.STORYBOOK === "true";

/** Firebase configuration with Storybook fallbacks. */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    (isStorybook ? "storybook" : undefined),
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    (isStorybook ? "localhost" : undefined),
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    (isStorybook ? "storybook" : undefined),
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (isStorybook ? "storybook.appspot.com" : undefined),
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    (isStorybook ? "storybook" : undefined),
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    (isStorybook ? "storybook" : undefined),
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  if (isStorybook) {
    console.warn(
      "Firebase configuration is incomplete for Storybook. Falling back to emulator defaults.",
    );
  } else {
    console.error(
      "Firebase configuration is incomplete. Please check your environment variables.",
    );
    throw new Error(
      "Firebase configuration is incomplete. Please check your environment variables.",
    );
  }
}

// Initialize Firebase only once
/** Singleton Firebase app instance. */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
/** Firestore database instance. */
const db = getFirestore(app);
/** Firebase auth instance. */
const auth = getAuth(app);
/** Firebase storage instance. */
const storage = getStorage(app);

const emulatorHost =
  process.env.FIRESTORE_EMULATOR_HOST ??
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ??
  (isStorybook ? "127.0.0.1:8080" : undefined);

if (emulatorHost) {
  const [host, portValue] = emulatorHost.split(":");
  const port = Number(portValue) || 8080;
  const globalState = globalThis as typeof globalThis & {
    __firestoreEmulatorConnected?: boolean;
  };

  if (!globalState.__firestoreEmulatorConnected) {
    connectFirestoreEmulator(db, host, port);
    globalState.__firestoreEmulatorConnected = true;
  }
}

export { app, auth, db, storage };
