-- CreateTable
CREATE TABLE "AuthAttempt" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT,
    "ip" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAttempt_kind_email_created_at_idx" ON "AuthAttempt"("kind", "email", "created_at");

-- CreateIndex
CREATE INDEX "AuthAttempt_kind_ip_created_at_idx" ON "AuthAttempt"("kind", "ip", "created_at");

-- CreateIndex
CREATE INDEX "AuthAttempt_created_at_idx" ON "AuthAttempt"("created_at");
