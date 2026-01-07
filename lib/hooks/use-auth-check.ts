"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirects unauthenticated or unauthorized users and returns auth state. */
export function useAuthCheck(requiredRole?: "viewer" | "editor" | "admin") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }

    if (!loading && user && requiredRole) {
      const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
      const userLevel = roleHierarchy[user.role];
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        router.push("/");
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
