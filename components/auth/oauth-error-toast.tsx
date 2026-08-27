"use client";

import { useEffect } from "react";

import { toast } from "@/components/ui/toast";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";

/** Shows a toast for the `?error=` param NextAuth appends when an OAuth sign-in fails or is cancelled. */
export function OAuthErrorToast({ error }: { error?: string }) {
  useEffect(() => {
    if (error) toast.error(getAuthErrorMessage(error));
  }, [error]);

  return null;
}
