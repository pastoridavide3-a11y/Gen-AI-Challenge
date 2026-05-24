"use client";

import { ReactNode } from "react";
import { ProfileProvider } from "@/lib/profile-context";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import type { ProfileBundle } from "@/lib/db/rows";

export function AppShell({
  initialBundles,
  children,
}: {
  initialBundles: ProfileBundle[];
  children: ReactNode;
}) {
  return (
    <ProfileProvider initialBundles={initialBundles}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />
        <main className="ml-64 pt-16">
          <div className="p-6">{children}</div>
        </main>
      </div>
      <Toaster />
    </ProfileProvider>
  );
}
