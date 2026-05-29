"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, FileText, User, MessageCircle, MoreHorizontal, Check, LogOut } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { targetRoleLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/db/browser-client";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cvs", icon: FileText, label: "I miei CV" },
  { href: "/profile", icon: User, label: "Profilo" },
  { href: "/mentor", icon: MessageCircle, label: "Mentor" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { current, setCurrentSlug, summaries } = useProfile();
  const careerScore = current.careerScore;
  const profile = current.profile;
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo + profile switcher */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-semibold text-primary-foreground">N</span>
        </div>
        <span className="flex-1 text-base font-semibold text-foreground">Navis</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
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
                    {summary.year} · {targetRoleLabel(summary.targetRole)}
                  </div>
                </div>
                {summary.slug === profile.slug && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = 
            item.href === "/" 
              ? pathname === "/" 
              : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Career Score Widget */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Punteggio Carriera
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-foreground">
              {careerScore ?? "—"}
            </span>
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${careerScore ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Obiettivo: {targetRoleLabel(current.profile.target_role)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {loggingOut ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          {loggingOut ? "Disconnessione..." : "Esci"}
        </button>
      </div>
    </aside>
  );
}
