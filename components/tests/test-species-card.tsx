"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";

/** Props for the TestSpeciesCard component. */
export interface TestSpeciesCardProps {
  /** Image URL chosen for the test prompt. */
  imageUrl: string | null;
  /** Prompt text shown above the image. */
  prompt?: string;
  /** Familiarity percentage for the current species under active test settings. */
  familiarityPercent: number | null;
}

/** Renders the test prompt image card for the current species. */
export function TestSpeciesCard({
  imageUrl,
  prompt,
  familiarityPercent,
}: TestSpeciesCardProps) {
  const { t } = useI18n();

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <h2 className="text-2xl font-semibold text-center">
          {prompt ?? t("test.species.prompt")}
        </h2>

        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("test.species.expectedFamiliarity")}
          </p>
          <p className="text-sm font-semibold">
            {familiarityPercent === null
              ? t("test.species.noFamiliarityData")
              : t("test.species.familiarityPercent", {
                  percent: familiarityPercent,
                })}
          </p>
        </div>

        {imageUrl ? (
          <div className="relative flex-1 rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt={t("test.species.imageAlt")}
              fill
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="flex-1 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">{t("test.species.noImage")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
