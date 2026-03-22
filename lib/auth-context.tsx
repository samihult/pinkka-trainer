"use client";

import type React from "react";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "./firebase/firebase-config";
import type { User, UserRole } from "./types";
import { normalizeTestPreferences } from "./tests/test-preferences";

/** Normalize stored favorite group ids into a unique string array. */
function normalizeFavoriteGroupIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((entry): entry is string => typeof entry === "string"),
    ),
  ];
}

/** Provides app-wide auth state and actions for Firebase providers. */
/** Context shape for authentication state and actions. */
interface AuthContextType {
  /** App-specific user profile. */
  user: User | null;
  /** Raw Firebase user object. */
  firebaseUser: FirebaseUser | null;
  /** Whether auth state is still loading. */
  loading: boolean;
  /** Sign in with email/password. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Create a new user with email/password. */
  signUp: (email: string, password: string) => Promise<void>;
  /** Start Google sign-in flow. */
  signInWithGoogle: () => Promise<void>;
  /** Start anonymous sign-in flow. */
  signInAnonymously: () => Promise<void>;
  /** Sign out of the current session. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Load or create a user document for the Firebase user. */
async function createOrGetUserDocument(
  firebaseUser: FirebaseUser,
): Promise<User> {
  try {
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const rawStoredPreferences =
        userData.preferences?.test ?? userData.preferences?.quiz;
      const storedTestPreferences = rawStoredPreferences
        ? normalizeTestPreferences(rawStoredPreferences)
        : undefined;
      const favoriteGroupIds = normalizeFavoriteGroupIds(
        userData.preferences?.home?.favoriteGroupIds,
      );
      const storedPreferences =
        storedTestPreferences || favoriteGroupIds.length > 0
          ? {
              ...(storedTestPreferences ? { test: storedTestPreferences } : {}),
              ...(favoriteGroupIds.length > 0
                ? { home: { favoriteGroupIds } }
                : {}),
            }
          : undefined;
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        isAnonymous: firebaseUser.isAnonymous,
        role: userData.role as UserRole,
        displayName: userData.displayName,
        createdAt: userData.createdAt?.toDate(),
        preferences: storedPreferences,
      };
    } else {
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
        isAnonymous: firebaseUser.isAnonymous,
        role: "viewer",
        displayName: firebaseUser.displayName || undefined,
        createdAt: new Date(),
      };
      const userDocumentData: Record<string, unknown> = {
        uid: newUser.uid,
        isAnonymous: newUser.isAnonymous,
        role: newUser.role,
        createdAt: newUser.createdAt,
      };
      if (newUser.email) userDocumentData.email = newUser.email;
      if (newUser.displayName)
        userDocumentData.displayName = newUser.displayName;
      await setDoc(doc(db, "users", firebaseUser.uid), userDocumentData);
      return newUser;
    }
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error(
        "⚠️ Firestore Security Rules Error:\n" +
          "Your Firestore security rules are blocking access.\n" +
          "To fix this:\n" +
          "1. Go to Firebase Console > Firestore Database > Rules\n" +
          "2. Copy the rules from scripts/firestore.rules in your project\n" +
          "3. Click 'Publish' to apply the rules\n\n" +
          "The app will continue to work with limited functionality until rules are updated.",
      );
    } else {
      console.error("Firestore error:", error.message);
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? undefined,
      isAnonymous: firebaseUser.isAnonymous,
      role: "viewer",
      displayName: firebaseUser.displayName || undefined,
      createdAt: new Date(),
    };
  }
}

/** Provides authentication state and actions to the app tree. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectHandled, setRedirectHandled] = useState(false);
  const isSigningInAnonymouslyRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const checkRedirectResult = async () => {
      if (redirectHandled) return;

      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setRedirectHandled(true);
          await createOrGetUserDocument(result.user);
          router.push("/learn");
        }
      } catch (error: any) {
        console.error("Redirect result error:", error.message);
      }
    };

    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        const userData = await createOrGetUserDocument(firebaseUser);
        setUser(userData);
        setLoading(false);
      } else {
        setUser(null);
        if (isSigningInAnonymouslyRef.current) return;

        isSigningInAnonymouslyRef.current = true;
        try {
          await firebaseSignInAnonymously(auth);
          return;
        } catch (error: any) {
          console.error("Anonymous sign-in error:", error.message);
          setLoading(false);
        } finally {
          isSigningInAnonymouslyRef.current = false;
        }
      }
    });

    return () => unsubscribe();
  }, [redirectHandled, router]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await createOrGetUserDocument(userCredential.user);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    try {
      const result = await signInWithPopup(auth, provider);
      await createOrGetUserDocument(result.user);
      router.push("/learn");
    } catch (popupError: any) {
      if (
        popupError.code !== "auth/popup-closed-by-user" &&
        popupError.code !== "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, provider);
      } else {
        throw popupError;
      }
    }
  };

  const signInAnonymously = async () => {
    const result = await firebaseSignInAnonymously(auth);
    await createOrGetUserDocument(result.user);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInAnonymously,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Access the current authentication context. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
