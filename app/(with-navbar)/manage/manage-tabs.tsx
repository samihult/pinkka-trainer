"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/dist/client/components/navigation";
import { ButtonConnector } from "@/components/ui/button-connector";

export default function ManageTabs() {
  const path = usePathname();

  const contentMatch = path.match(
    new RegExp("^/manage/content(/([^/]+)/species(/([^/]+))?)?"),
  );
  console.log("*** pathMatch", contentMatch);
  const stackId = contentMatch?.[2];
  const speciesId = contentMatch?.[4];

  const pinkkaMatch = path.match(new RegExp("/manage/pinkka"));

  return (
    <nav className="container mx-auto px-4 pt-5 flex justify-center items-center gap-0">
      <Button
        asChild
        size="sm"
        variant={contentMatch && !stackId ? "default" : "secondary"}
      >
        <Link href="/manage/content">Groups</Link>
      </Button>
      {stackId && (
        <>
          <ButtonConnector />
          <Button
            asChild
            size="sm"
            variant={stackId && !speciesId ? "default" : "secondary"}
          >
            <Link href={`/manage/content/${stackId}/species`}>Stack</Link>
          </Button>

          {speciesId && (
            <>
              <ButtonConnector />
              <Button asChild size="sm" variant="default">
                <Link href={`/manage/content/${stackId}/species/${speciesId}`}>
                  Species
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
        <Link href="/manage/pinkka">Pinkka</Link>
      </Button>
    </nav>
  );
}
