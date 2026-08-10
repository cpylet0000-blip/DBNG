-- AlterTable
ALTER TABLE "BingoSession" ADD COLUMN     "totalPrize" DOUBLE PRECISION,
ADD COLUMN     "winnersCount" INTEGER NOT NULL DEFAULT 0;
