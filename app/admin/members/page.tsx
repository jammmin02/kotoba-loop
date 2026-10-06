import { z } from "zod";

import { AdminMembersView } from "@/components/admin/admin-members-view";
import { adminMemberStatusSchema } from "@/lib/validations/admin";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const parsed = adminMemberStatusSchema.or(z.literal("DELETED")).safeParse(status);

  return <AdminMembersView initialStatus={parsed.success ? parsed.data : "PENDING"} />;
}
