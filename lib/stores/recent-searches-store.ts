"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT_SEARCHES = 8;

interface RecentSearchesState {
  queries: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      queries: [],
      add: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          const deduped = [trimmed, ...state.queries.filter((q) => q !== trimmed)];
          return { queries: deduped.slice(0, MAX_RECENT_SEARCHES) };
        }),
      remove: (query) => set((state) => ({ queries: state.queries.filter((q) => q !== query) })),
      clear: () => set({ queries: [] }),
    }),
    { name: "kotoba-recent-searches" },
  ),
);
