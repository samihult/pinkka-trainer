import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { HomePageClient } from "@/components/home/home-page-client";

/** Home page wrapper with suspense for search params usage. */
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <LoadingSpinner className="py-12" />
        </div>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
