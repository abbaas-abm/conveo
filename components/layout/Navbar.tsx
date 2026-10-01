"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="DLU home">
          <Image
            src="/wits-logo-white.png"
            alt="University of the Witwatersrand"
            width={150}
            height={42}
            priority
            className="h-9 w-auto"
          />
          <span className="h-8 w-px bg-gray-200" aria-hidden />
          <span className="text-sm font-semibold leading-tight text-primary">
            DLU
            <span className="block text-[11px] font-normal text-gray-500">
              Development &amp; Leadership
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-gray-600 hover:bg-slate-50 hover:text-gray-900",
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {profile ? (
            <>
              <Button asChild size="sm">
                <Link href="/user">Dashboard</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
              <span className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {initials(profile.first_name, profile.last_name)}
              </span>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-md text-gray-700 hover:bg-slate-50 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-slate-50 text-primary"
                      : "text-gray-700 hover:bg-slate-50",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-3">
              {profile ? (
                <>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/user">Dashboard</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    disabled={signingOut}
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
