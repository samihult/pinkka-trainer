"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { PinkkaExplorer } from "@/components/pinkka/pinkka-explorer";

/** Admin-facing page for browsing Pinkka content. */
export default function PinkkaContentPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">Pinkka Content</h1>
            <p className="text-sm text-muted-foreground">
              Browse Pinkka groups, stacks, and species details.
            </p>
          </div>
          <div className="flex-1">
            <div className="h-[70vh]">
              <PinkkaExplorer />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
