-- CreateTable
CREATE TABLE "DepositBonus" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "originalDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusGiven" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositBonus_userId_key" ON "DepositBonus"("userId");

-- AddForeignKey
ALTER TABLE "DepositBonus" ADD CONSTRAINT "DepositBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
