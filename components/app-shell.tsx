"use client";

import { ReactNode } from "react";
import { ProfileProvider } from "@/lib/profile-context";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />
        <main className="ml-64 pt-16">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </ProfileProvider>
  );
}
