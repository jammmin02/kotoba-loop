import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * Coalesces concurrent requests for the same (user, analysisType, inputRef)
 * within this process so they share one in-flight AI call instead of firing
 * duplicates. This is a single-process optimization; the DB unique
 * constraint below is what makes duplicate *persistence* impossible even
 * across processes.
 */
const inflightRequests = new Map<string, Promise<unknown>>();

export interface AnalysisCacheParams<T> {
  userId: string;
  analysisType: string;
  inputRef: string;
  run: () => Promise<T>;
}

export interface AnalysisCacheResult<T> {
  id: string;
  status: string;
  data: T;
  /** True when an existing AIAnalysis row was reused instead of calling the AI. */
  cached: boolean;
}

export async function withAnalysisCache<T>({
  userId,
  analysisType,
  inputRef,
  run,
}: AnalysisCacheParams<T>): Promise<AnalysisCacheResult<T>> {
  const where = {
    user_id_analysis_type_input_ref: {
      user_id: userId,
      analysis_type: analysisType,
      input_ref: inputRef,
    },
  };

  const existing = await db.aIAnalysis.findUnique({ where });
  if (existing) {
    return { id: existing.id, status: existing.status, data: existing.result_json as T, cached: true };
  }

  const key = `${userId}:${analysisType}:${inputRef}`;
  const inflight = inflightRequests.get(key) as Promise<AnalysisCacheResult<T>> | undefined;
  if (inflight) {
    return inflight;
  }

  const promise = (async (): Promise<AnalysisCacheResult<T>> => {
    const data = await run();

    try {
      const created = await db.aIAnalysis.create({
        data: {
          user_id: userId,
          analysis_type: analysisType,
          input_ref: inputRef,
          result_json: data as Prisma.InputJsonValue,
          status: "pending",
        },
      });
      return { id: created.id, status: created.status, data, cached: false };
    } catch (err) {
      // Another process won the race and persisted first — reuse its result
      // rather than erroring, so the caller still gets a valid response.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const winner = await db.aIAnalysis.findUnique({ where });
        if (winner) {
          return { id: winner.id, status: winner.status, data: winner.result_json as T, cached: true };
        }
      }
      throw err;
    }
  })();

  inflightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(key);
  }
}
