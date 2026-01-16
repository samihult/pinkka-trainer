import React from "react";
import ManageTabs from "@/app/(with-navbar)/manage/manage-tabs";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      <ManageTabs />
      {children}
    </section>
  );
}
