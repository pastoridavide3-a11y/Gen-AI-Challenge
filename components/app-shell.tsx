"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ProfileProvider, useProfile } from "@/lib/profile-context";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import type { ProfileBundle } from "@/lib/db/rows";

export function AppShell({
  initialBundles,
  children,
}: {
  initialBundles: ProfileBundle[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  // The login screen is a standalone, full-bleed page: no sidebar, no profile
  // context (there's no active profile until you're authenticated).
  if (pathname === "/login") {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <ProfileProvider initialBundles={initialBundles}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64">
          <ProfileScopedContent>{children}</ProfileScopedContent>
        </main>
      </div>
      <Toaster />
    </ProfileProvider>
  );
}

// Switching the active profile must reset every screen to that profile's data.
// Screens initialize profile-derived local state once on mount (the Profile form
// draft, the CV detail view's selected CV, etc.), so without a remount they keep
// showing the previous profile until you navigate away and back. Keying the page
// subtree on the profile id makes React remount it on every switch, re-running all
// `useState` initializers against the new profile. This is the single place that
// handles profile changes for every view — screens don't each need a reset effect.
//
// In-profile updates (applyAnalysis, applyMentorTurn, removeConversation) keep the
// same profile id, so they update in place without remounting.
function ProfileScopedContent({ children }: { children: ReactNode }) {
  const { current } = useProfile();
  return (
    <div key={current.profile.id} className="p-6">
      {children}
    </div>
  );
}
