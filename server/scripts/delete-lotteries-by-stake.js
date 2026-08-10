import prisma from '../lib/prisma.js';

const STAKES_TO_DELETE = [10, 20];

const getWinnerTableExists = async () => {
  try {
    const result = await prisma.$queryRaw`
      SELECT to_regclass('public."LotteryWinner"') AS table_name
    `;
    const tableName = Array.isArray(result) ? result[0]?.table_name : result?.table_name;
    return Boolean(tableName);
  } catch (err) {
    return false;
  }
};

const run = async () => {
  const lotteries = await prisma.lottery.findMany({
    where: { stake_amount: { in: STAKES_TO_DELETE } },
    select: { id: true, stake_amount: true },
  });

  if (lotteries.length === 0) {
    console.log('No lotteries found for stakes:', STAKES_TO_DELETE.join(', '));
    return;
  }

  const lotteryIds = lotteries.map((lottery) => lottery.id);
  const hasWinnersTable = await getWinnerTableExists();

  const operations = [];
  if (hasWinnersTable) {
    operations.push(prisma.lotteryWinner.deleteMany({ where: { lotteryId: { in: lotteryIds } } }));
  }
  operations.push(prisma.lotteryTicket.deleteMany({ where: { lotteryId: { in: lotteryIds } } }));
  operations.push(prisma.lottery.deleteMany({ where: { id: { in: lotteryIds } } }));

  const results = await prisma.$transaction(operations);

  const winnersDeleted = hasWinnersTable ? results[0]?.count ?? 0 : 0;
  const ticketsDeleted = hasWinnersTable ? results[1]?.count ?? 0 : results[0]?.count ?? 0;
  const lotteriesDeleted = hasWinnersTable ? results[2]?.count ?? 0 : results[1]?.count ?? 0;

  console.log('Deleted lotteries:', lotteriesDeleted);
  console.log('Deleted tickets:', ticketsDeleted);
  if (hasWinnersTable) {
    console.log('Deleted winners:', winnersDeleted);
  } else {
    console.log('LotteryWinner table not found. Skipped winners deletion.');
  }
};

run()
  .catch((err) => {
    console.error('Delete failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
