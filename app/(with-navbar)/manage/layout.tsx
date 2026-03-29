import React from "react";
import ManageTabs from "@/app/(with-navbar)/manage/manage-tabs";
import { ManagePinkkaImportToastProvider } from "@/components/manage-pinkka-import-toast-provider";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ManagePinkkaImportToastProvider>
      <section>
        <ManageTabs />
        {children}
      </section>
    </ManagePinkkaImportToastProvider>
  );
}
