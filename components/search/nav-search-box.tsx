"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PixelSearch } from "@/components/icons/pixel-icons";
import { useRecentSearchesStore } from "@/lib/stores/recent-searches-store";
import { cn } from "@/lib/utils";

import type { FormEvent } from "react";

export function NavSearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const addRecentSearch = useRecentSearchesStore((s) => s.add);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const query = value.trim();
    if (!query) return;
    addRecentSearch(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("flex", className)}>
      <div className="flex h-10 w-full items-center gap-1.5 border-2 border-pixel-ink bg-background px-2 shadow-bevel-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
        <PixelSearch className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="단어 검색"
          aria-label="단어 검색"
          className="h-full w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
      </div>
    </form>
  );
}
