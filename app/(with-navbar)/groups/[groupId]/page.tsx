"use client";

import { useParams } from "next/navigation";
import { GroupPageClient } from "@/components/home/group-page-client";

/** Collection page route wrapper for learner-facing stack browsing. */
export default function GroupPage() {
  const params = useParams();
  const groupId = decodeURIComponent(params.groupId as string);

  return <GroupPageClient groupId={groupId} />;
}
