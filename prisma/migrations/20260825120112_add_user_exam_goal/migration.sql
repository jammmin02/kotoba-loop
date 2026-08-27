-- CreateTable
CREATE TABLE "UserExamGoal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_jlpt" "JlptLevel" NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserExamGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserExamGoal_user_id_is_active_idx" ON "UserExamGoal"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "UserExamGoal_user_id_exam_date_idx" ON "UserExamGoal"("user_id", "exam_date");

-- AddForeignKey
ALTER TABLE "UserExamGoal" ADD CONSTRAINT "UserExamGoal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
