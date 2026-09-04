-- CreateEnum
CREATE TYPE "RelatedExpressionType" AS ENUM ('SIMILAR', 'OPPOSITE', 'DERIVED');

-- CreateTable
CREATE TABLE "VocabularyRelatedExpression" (
    "id" TEXT NOT NULL,
    "vocabulary_id" TEXT NOT NULL,
    "relation_type" "RelatedExpressionType" NOT NULL,
    "expression" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VocabularyRelatedExpression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularyRelatedExpression_vocabulary_id_idx" ON "VocabularyRelatedExpression"("vocabulary_id");

-- AddForeignKey
ALTER TABLE "VocabularyRelatedExpression" ADD CONSTRAINT "VocabularyRelatedExpression_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
