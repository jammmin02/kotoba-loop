import { z } from "zod";

import { PET_SPECIES } from "@/lib/pet/constants";

export const petSelectSchema = z.object({
  species: z.enum(PET_SPECIES),
});

export type PetSelectInput = z.infer<typeof petSelectSchema>;
