"use client";

import { useProfile } from "@/lib/profile-context";
import { targetRoleLabel } from "@/lib/labels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

export function Header() {
  const { current, setCurrentSlug, summaries } = useProfile();
  const profile = current.profile;

  return (
    <header className="fixed left-64 right-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        {/* Breadcrumb or page title can go here */}
      </div>

      {/* Profile Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {profile.avatar}
          </div>
          <div className="text-left">
            <div className="font-medium text-foreground">{profile.name}</div>
            <div className="text-xs text-muted-foreground">
              {profile.university}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Cambia profilo demo
          </div>
          {summaries.map((summary) => (
            <DropdownMenuItem
              key={summary.slug}
              onClick={() => setCurrentSlug(summary.slug)}
              className="flex cursor-pointer items-center gap-3 py-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {summary.avatar}
              </div>
              <div className="flex-1">
                <div className="font-medium">{summary.name}</div>
                <div className="text-xs text-muted-foreground">
                  {summary.year} - {targetRoleLabel(summary.targetRole)}
                </div>
              </div>
              {summary.slug === profile.slug && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
