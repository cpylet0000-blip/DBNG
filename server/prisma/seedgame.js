import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const games = [
  { name: 'Bingo', to: '/games/bingo', image: '/bingo.png', fullWidth: false },
  { name: 'Spin Win', to: '/games/spin-win', image: '/roulette.png', fullWidth: false },
];

async function main() {
  for (const game of games) {
    await prisma.game.upsert({
      where: { name: game.name },
      update: {
        status: 'ACTIVE',
        image: game.image,
        to: game.to,
        fullWidth: game.fullWidth,
      },
      create: {
        name: game.name,
        image: game.image,
        to: game.to,
        fullWidth: game.fullWidth,
        status: 'ACTIVE',
        numberOfPlayed: 0,
      },
    });
  }
  console.log('Seeded games table with active status');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
