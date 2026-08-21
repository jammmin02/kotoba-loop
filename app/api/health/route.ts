import { z } from "zod";

import { withApiHandler } from "@/lib/api/handler";
import { formatKstISOString } from "@/lib/datetime";

import type { NextRequest } from "next/server";

const healthQuerySchema = z.object({
  verbose: z.enum(["true", "false"]).optional(),
});

interface HealthData {
  status: "ok";
  timestamp: string;
  uptimeSeconds?: number;
}

export const GET = withApiHandler(async (req: NextRequest): Promise<HealthData> => {
  const { searchParams } = new URL(req.url);
  const { verbose } = healthQuerySchema.parse(Object.fromEntries(searchParams));

  return {
    status: "ok",
    timestamp: formatKstISOString(),
    ...(verbose === "true" ? { uptimeSeconds: process.uptime() } : {}),
  };
});
