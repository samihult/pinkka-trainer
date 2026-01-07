"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "./firebase-config";
import type { User, UserRole } from "./types";

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
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        role: userData.role as UserRole,
        displayName: userData.displayName,
        createdAt: userData.createdAt?.toDate(),
      };
    } else {
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        role: "viewer",
        displayName: firebaseUser.displayName || undefined,
        createdAt: new Date(),
      };
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
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
      email: firebaseUser.email!,
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
      } else {
        setUser(null);
      }

      setLoading(false);
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
