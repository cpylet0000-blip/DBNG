-- DropForeignKey
ALTER TABLE "DepositBonus" DROP CONSTRAINT "DepositBonus_userId_fkey";

-- CreateIndex
CREATE INDEX "DepositBonus_userId_idx" ON "DepositBonus"("userId");

-- AddForeignKey
ALTER TABLE "DepositBonus" ADD CONSTRAINT "DepositBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
