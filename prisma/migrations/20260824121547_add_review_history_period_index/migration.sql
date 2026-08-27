-- CreateIndex
CREATE INDEX "ReviewHistory_user_id_reviewed_at_idx" ON "ReviewHistory"("user_id", "reviewed_at");
