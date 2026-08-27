import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { formatKstISOString } from "@/lib/datetime";
import { db } from "@/lib/db";

interface DbHealthData {
  status: "ok";
  timestamp: string;
}

export const GET = withApiHandler(async (): Promise<DbHealthData> => {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error(err);
    throw new ApiError("EXTERNAL_API_ERROR", "데이터베이스에 연결할 수 없습니다.");
  }

  return {
    status: "ok",
    timestamp: formatKstISOString(),
  };
});
