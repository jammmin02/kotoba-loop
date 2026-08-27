-- AlterTable
ALTER TABLE "ReviewHistory" ADD COLUMN "request_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewHistory_request_id_key" ON "ReviewHistory"("request_id");
