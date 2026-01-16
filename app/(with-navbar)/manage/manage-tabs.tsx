"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ManageTabs() {
  // This will be "a" or "b"
  const segment = useSelectedLayoutSegments()[1];

  const tabs = [
    { href: "/manage/content", segment: "content", label: "Content" },
    { href: "/manage/pinkka", segment: "pinkka", label: "Pinkka" },
  ];

  return (
    <nav className="container mx-auto px-4 pt-5 flex justify-center gap-2">
      {tabs.map((tab) => {
        const active = segment === tab.segment;

        return (
          <Button
            asChild
            size="sm"
            variant={active ? "default" : "secondary"}
            key={tab.segment}
          >
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
