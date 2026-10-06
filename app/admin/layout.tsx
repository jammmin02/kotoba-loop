import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/auth-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage("/admin");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      {children}
    </main>
  );
}
