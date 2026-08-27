import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listPetHistory } from "@/lib/pet/service";
import type { PetHistoryResponse } from "@/types/pet";

export const GET = withApiHandler(async (): Promise<PetHistoryResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const pets = await listPetHistory(db, session.user.id);

  return pets.map((pet) => ({
    id: pet.id,
    species: pet.species,
    stage: pet.stage,
    isActive: pet.is_active,
    isGraduated: pet.is_graduated,
    startedAt: pet.started_at.toISOString(),
    graduatedAt: pet.graduated_at ? pet.graduated_at.toISOString() : null,
  }));
});
