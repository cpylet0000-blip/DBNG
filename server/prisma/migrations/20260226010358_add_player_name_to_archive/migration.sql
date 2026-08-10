-- AlterTable
ALTER TABLE "BingoSessionPlayerArchive" ADD COLUMN     "name" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "LotteryWinner" (
    "id" SERIAL NOT NULL,
    "lotteryId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "prizePosition" INTEGER NOT NULL,
    "prizeAmount" DOUBLE PRECISION NOT NULL,
    "prizeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LotteryWinner_lotteryId_prizePosition_key" ON "LotteryWinner"("lotteryId", "prizePosition");

-- AddForeignKey
ALTER TABLE "LotteryWinner" ADD CONSTRAINT "LotteryWinner_lotteryId_fkey" FOREIGN KEY ("lotteryId") REFERENCES "Lottery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryWinner" ADD CONSTRAINT "LotteryWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
