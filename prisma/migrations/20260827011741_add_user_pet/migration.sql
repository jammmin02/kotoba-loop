-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('cat', 'dinosaur', 'rabbit');

-- CreateEnum
CREATE TYPE "PetStage" AS ENUM ('egg', 'baby', 'child', 'teen', 'adult');

-- CreateTable
CREATE TABLE "UserPet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "stage" "PetStage" NOT NULL DEFAULT 'egg',
    "level_at_start" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_graduated" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graduated_at" TIMESTAMP(3),

    CONSTRAINT "UserPet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPet_user_id_is_active_idx" ON "UserPet"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "UserPet" ADD CONSTRAINT "UserPet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
