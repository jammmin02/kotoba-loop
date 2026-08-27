-- CreateIndex
CREATE INDEX "ReviewHistory_user_id_quiz_type_result_idx" ON "ReviewHistory"("user_id", "quiz_type", "result");
