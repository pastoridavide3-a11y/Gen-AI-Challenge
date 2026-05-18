"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, User, MessageCircle } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cvs", icon: FileText, label: "My CVs" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/mentor", icon: MessageCircle, label: "Mentor" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentProfile } = useProfile();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-semibold text-primary-foreground">C</span>
        </div>
        <span className="text-lg font-semibold text-foreground">Career AI</span>
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
            Career Score
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-foreground">
              {currentProfile.careerScore}
            </span>
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${currentProfile.careerScore}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Targeting: {currentProfile.targetRole}
          </p>
        </div>
      </div>
    </aside>
  );
}
