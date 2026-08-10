-- CreateEnum
CREATE TYPE "LeaderboardType" AS ENUM ('INVITATION', 'PLAY');

-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'TOTAL');

-- CreateTable
CREATE TABLE "UserLeaderboardStat" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "LeaderboardType" NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLeaderboardStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLeaderboardStat_type_period_periodStart_idx" ON "UserLeaderboardStat"("type", "period", "periodStart");

-- CreateIndex
CREATE INDEX "UserLeaderboardStat_userId_type_period_periodStart_idx" ON "UserLeaderboardStat"("userId", "type", "period", "periodStart");

-- AddForeignKey
ALTER TABLE "UserLeaderboardStat" ADD CONSTRAINT "UserLeaderboardStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
