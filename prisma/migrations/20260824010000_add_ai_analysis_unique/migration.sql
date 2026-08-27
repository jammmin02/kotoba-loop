-- Dedup key for the AI Orchestration module's result cache: a completed
-- analysis for the same (user, analysis type, input) is reused instead of
-- calling the LLM again, and this constraint is what makes concurrent
-- duplicate requests collapse to a single persisted row.
CREATE UNIQUE INDEX "AIAnalysis_user_id_analysis_type_input_ref_key" ON "AIAnalysis"("user_id", "analysis_type", "input_ref");
