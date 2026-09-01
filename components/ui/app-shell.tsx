"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CatalogFooterText } from "@/components/catalog/catalog-notice";
import type { CatalogStatus } from "@/lib/data/catalog-status";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programs", label: "Programs", icon: Search },
  { href: "/supervisors", label: "Supervisors", icon: Users },
  { href: "/applications", label: "Applications", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: BookOpen },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function AppShell({
  children,
  catalogStatus,
}: {
  children: React.ReactNode;
  catalogStatus: CatalogStatus;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-red-700" />
            <span className="font-bold text-slate-900 hidden sm:inline">
              Canada Study Match
            </span>
            <span className="font-bold text-slate-900 sm:hidden">CSM</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            </nav>
            <SignOutButton />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <SignOutButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  pathname.startsWith(href)
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500 text-center">
            <CatalogFooterText status={catalogStatus} />
          </p>
        </div>
      </footer>
    </div>
  );
}
