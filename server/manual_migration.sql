-- Drop old unique constraint and recreate table structure
ALTER TABLE "DepositBonus" DROP CONSTRAINT IF EXISTS "DepositBonus_userId_key";
ALTER TABLE "DepositBonus" DROP COLUMN IF EXISTS "originalDeposit";
ALTER TABLE "DepositBonus" DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE "DepositBonus" ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "DepositBonus" ADD COLUMN IF NOT EXISTS "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "DepositBonus_userId_idx" ON "DepositBonus"("userId");
