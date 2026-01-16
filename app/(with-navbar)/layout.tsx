import type React from "react";
import { Navbar } from "@/components/navbar";

export default function WithNavbarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
