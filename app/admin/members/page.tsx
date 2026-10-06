import { AdminMembersView } from "@/components/admin/admin-members-view";
import { adminMemberStatusSchema } from "@/lib/validations/admin";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const parsed = adminMemberStatusSchema.safeParse(status);

  return <AdminMembersView initialStatus={parsed.success ? parsed.data : "PENDING"} />;
}
