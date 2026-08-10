/*
  Warnings:

  - A unique constraint covering the columns `[userId,type,period,periodStart]` on the table `UserLeaderboardStat` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserLeaderboardStat_userId_type_period_periodStart_key" ON "UserLeaderboardStat"("userId", "type", "period", "periodStart");
