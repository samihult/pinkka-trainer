"use client";

import type React from "react";

import { useAuthCheck } from "@/lib/hooks/use-auth-check";
import { LoadingSpinner } from "./loading-spinner";
import type { UserRole } from "@/lib/types";

/** Props for gating routes by auth and optional role. */
interface ProtectedRouteProps {
  /** Content gated behind auth. */
  children: React.ReactNode;
  /** Optional minimum role required. */
  requiredRole?: UserRole;
}

/** Renders children only when the user is authenticated and authorized. */
export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, loading } = useAuthCheck(requiredRole);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole) {
    const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      return null;
    }
  }

  return <>{children}</>;
}
