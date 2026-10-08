import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getMaintenanceState } from "@/lib/settings";

// 점검 상태는 요청마다 읽어야 하므로 정적으로 만들지 않는다.
export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const { enabled, message } = await getMaintenanceState();
  // 점검이 끝났으면 이 화면에 머물지 않고 홈으로 돌려보낸다.
  if (!enabled) redirect("/");

  return (
    <Card
      variant="elevated"
      title="MAINTENANCE.EXE"
      titleColor="accent"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-foreground">서비스 점검 중</h1>
        <p className="whitespace-pre-line text-sm font-content text-muted">{message}</p>
      </div>
    </Card>
  );
}
