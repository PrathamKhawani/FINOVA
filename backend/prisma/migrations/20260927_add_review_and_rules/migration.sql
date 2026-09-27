-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "time" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "upiId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "linkedAccount" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "userCategory" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "userSubcategory" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "userNote" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "appliedRuleId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserCategorizationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matchNarration" TEXT,
    "matchMerchant" TEXT,
    "matchVPA" TEXT,
    "matchDirection" TEXT,
    "matchPaymentType" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCategorizationRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_appliedRuleId_fkey'
  ) THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_appliedRuleId_fkey" FOREIGN KEY ("appliedRuleId") REFERENCES "UserCategorizationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserCategorizationRule_userId_fkey'
  ) THEN
    ALTER TABLE "UserCategorizationRule" ADD CONSTRAINT "UserCategorizationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
