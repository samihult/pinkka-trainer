"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/dist/client/components/navigation";
import { ButtonConnector } from "@/components/ui/button-connector";
import { useI18n } from "@/lib/i18n";

export default function ManageTabs() {
  const path = usePathname();
  const { t } = useI18n();

  const contentMatch = path.match(
    new RegExp("^/manage/content(/([^/]+)/species(/([^/]+))?)?"),
  );
  const stackId = contentMatch?.[2];
  const speciesId = contentMatch?.[4];

  const speciesMatch = path.match(new RegExp("^/manage/species(/([^/]+))?"));
  const topLevelSpeciesId = speciesMatch?.[2];
  const pinkkaMatch = path.match(new RegExp("/manage/pinkka"));

  return (
    <nav className="container mx-auto px-4 pt-5 flex justify-center items-center gap-0">
      <Button
        asChild
        size="sm"
        variant={speciesMatch && !topLevelSpeciesId ? "default" : "secondary"}
      >
        <Link href="/manage/species">{t("manage.tabs.species")}</Link>
      </Button>
      {topLevelSpeciesId && (
        <>
          <ButtonConnector />
          <Button asChild size="sm" variant="default">
            <Link href={`/manage/species/${topLevelSpeciesId}`}>
              {t("manage.tabs.speciesDetail")}
            </Link>
          </Button>
        </>
      )}

      <Button
        asChild
        size="sm"
        variant={contentMatch && !stackId ? "default" : "secondary"}
        className="ml-3"
      >
        <Link href="/manage/content">{t("manage.tabs.groups")}</Link>
      </Button>
      {stackId && (
        <>
          <ButtonConnector />
          <Button
            asChild
            size="sm"
            variant={stackId && !speciesId ? "default" : "secondary"}
          >
            <Link href={`/manage/content/${stackId}/species`}>
              {t("manage.tabs.stack")}
            </Link>
          </Button>

          {speciesId && (
            <>
              <ButtonConnector />
              <Button asChild size="sm" variant="default">
                <Link href={`/manage/content/${stackId}/species/${speciesId}`}>
                  {t("manage.tabs.speciesDetail")}
                </Link>
              </Button>
            </>
          )}
        </>
      )}

      <Button
        asChild
        size="sm"
        variant={pinkkaMatch ? "default" : "secondary"}
        className="ml-3"
      >
        <Link href="/manage/pinkka">{t("manage.tabs.pinkka")}</Link>
      </Button>
    </nav>
  );
}
