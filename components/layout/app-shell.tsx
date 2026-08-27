"use client";

import { usePathname } from "next/navigation";

import { Navigation } from "@/components/ui/navigation";

// Full-bleed, single-task screens that shouldn't show the app chrome/search box.
const CHROME_LESS_PREFIXES = ["/login", "/register", "/onboarding"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = CHROME_LESS_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (hideChrome) return <>{children}</>;

  return <Navigation>{children}</Navigation>;
}
