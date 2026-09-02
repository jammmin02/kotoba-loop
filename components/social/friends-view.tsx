"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { PixelSearch, PixelUsers } from "@/components/icons/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { FriendSummary, UserSearchResult } from "@/types/friend";

import type { FormEvent } from "react";

export function FriendsView() {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");

  const searchResults = useQuery({
    queryKey: ["users-search", query],
    queryFn: () => apiFetch<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
  });

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => apiFetch<FriendSummary[]>("/api/friends"),
  });

  const followMutation = useMutation({
    mutationFn: (followeeId: string) => apiFetch("/api/friends", { method: "POST", body: { followeeId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-search"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "팔로우 중 오류가 발생했습니다.");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/friends/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-search"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "언팔로우 중 오류가 발생했습니다.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setQuery(inputValue.trim());
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-extrabold text-foreground">친구</h1>

      <Card variant="elevated" title="닉네임으로 찾기" className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} role="search" className="flex gap-2">
          <div className="flex h-11 flex-1 items-center gap-2 border-2 border-pixel-ink bg-background px-3 shadow-bevel-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
            <PixelSearch className="size-4 shrink-0 text-foreground/50" aria-hidden="true" />
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="닉네임 검색"
              aria-label="닉네임 검색"
              className="h-full w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
          </div>
          <Button type="submit">검색</Button>
        </form>

        {searchResults.isLoading && <p className="text-sm text-foreground/60">검색 중...</p>}

        {searchResults.isError && (
          <p className="text-sm text-error">
            {searchResults.error instanceof ApiClientError
              ? searchResults.error.message
              : "검색 중 오류가 발생했습니다."}
          </p>
        )}

        {searchResults.data && searchResults.data.length === 0 && (
          <p className="text-sm text-foreground/50">검색 결과가 없습니다.</p>
        )}

        {searchResults.data && searchResults.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {searchResults.data.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-2 border-2 border-pixel-ink bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{user.nickname}</p>
                  <p className="truncate text-xs text-foreground/50">{user.email}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={user.isFollowing ? "outline" : "primary"}
                  disabled={user.isFollowing}
                  loading={followMutation.isPending && followMutation.variables === user.id}
                  onClick={() => followMutation.mutate(user.id)}
                >
                  {user.isFollowing ? "팔로우 중" : "팔로우"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="elevated" title="팔로우 중" className="flex flex-col gap-3">
        {friends.isLoading && <p className="text-sm text-foreground/60">불러오는 중...</p>}

        {friends.isError && (
          <p className="text-sm text-error">
            {friends.error instanceof ApiClientError ? friends.error.message : "목록을 불러오지 못했습니다."}
          </p>
        )}

        {friends.data && friends.data.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <PixelUsers className="size-10 text-foreground/30" aria-hidden="true" />
            <p className="text-sm font-content text-foreground/60">
              아직 팔로우 중인 사용자가 없어요. 닉네임으로 찾아보세요.
            </p>
          </div>
        )}

        {friends.data && friends.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {friends.data.map((friend) => (
              <li
                key={friend.userId}
                className="flex items-center justify-between gap-2 border-2 border-pixel-ink bg-surface p-3"
              >
                <Link
                  href={`/community?userId=${friend.userId}&nickname=${encodeURIComponent(friend.nickname)}`}
                  className="min-w-0"
                >
                  <p className="truncate text-sm font-bold text-foreground hover:underline">
                    {friend.nickname}
                  </p>
                  <p className="truncate text-xs text-foreground/50">공개 단어장 {friend.publicBookCount}개</p>
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={unfollowMutation.isPending && unfollowMutation.variables === friend.userId}
                  onClick={() => unfollowMutation.mutate(friend.userId)}
                >
                  언팔로우
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
