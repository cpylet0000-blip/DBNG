-- CreateTable
CREATE TABLE "spin_win_games" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "spin_win_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spin_win_spins" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "winningNumber" INTEGER NOT NULL,
    "winningColor" TEXT NOT NULL,
    "spinResult" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spin_win_spins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spin_win_bets" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "betType" TEXT NOT NULL,
    "betValue" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "winnings" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spin_win_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spin_win_jackpots" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "requirement" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spin_win_jackpots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spin_win_jackpot_wins" (
    "id" SERIAL NOT NULL,
    "jackpotId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "spinNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spin_win_jackpot_wins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spin_win_games_gameId_key" ON "spin_win_games"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "spin_win_jackpots_name_key" ON "spin_win_jackpots"("name");

-- AddForeignKey
ALTER TABLE "spin_win_spins" ADD CONSTRAINT "spin_win_spins_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "spin_win_games"("gameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_win_spins" ADD CONSTRAINT "spin_win_spins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_win_bets" ADD CONSTRAINT "spin_win_bets_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "spin_win_games"("gameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_win_bets" ADD CONSTRAINT "spin_win_bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_win_jackpot_wins" ADD CONSTRAINT "spin_win_jackpot_wins_jackpotId_fkey" FOREIGN KEY ("jackpotId") REFERENCES "spin_win_jackpots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_win_jackpot_wins" ADD CONSTRAINT "spin_win_jackpot_wins_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "spin_win_games"("gameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spin_win_jackpot_wins" ADD CONSTRAINT "spin_win_jackpot_wins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
