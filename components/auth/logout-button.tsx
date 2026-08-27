"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button type="button" variant="outline" onClick={() => signOut({ redirectTo: "/login" })}>
      로그아웃
    </Button>
  );
}
