
import prisma from '../lib/prisma.js'
function generateBingoCard() {
  const card = []
  const columnRanges = [
    [1, 15],   // B
    [16, 30],  // I
    [31, 45],  // N
    [46, 60],  // G
    [61, 75],  // O
  ]
  for (let col = 0; col < 5; col++) {
    const [min, max] = columnRanges[col]
    const available = []
    for (let i = min; i <= max; i++) {
      available.push(i)
    }

    // Pick 5 unique numbers from this column
    for (let row = 0; row < 5; row++) {
      const idx = Math.floor(Math.random() * available.length)
      card.push(available[idx])
      available.splice(idx, 1)
    }
  }

  return card
}


async function seedBingoCards() {
  console.log('🎲 Seeding 400 Bingo Cards for each stake (identical across stakes)...')

  const stakes = [10, 20, 50, 100];
  const NUM_CARDS = 200;

  // First, delete all existing bingo cards
  await prisma.bingoCard.deleteMany({});

  // Generate 400 unique cards (numbers only, no stake)
  const baseCards = [];
  for (let cardId = 1; cardId <= NUM_CARDS; cardId++) {
    const numbers = generateBingoCard();
    baseCards.push({ cardId, numbers: JSON.stringify(numbers) });
  }
  let totalCreated = 0;
  // For each stake, insert the same 400 cards (cardId 1-400, identical numbers)
  for (const stake of stakes) {
    const cards = baseCards.map(card => ({
      cardId: card.cardId,
      stake,
      numbers: card.numbers,
    }));
    await prisma.bingoCard.createMany({ data: cards });
    totalCreated += cards.length;
  }

  console.log({totalCreated});
  console.log('🎉 Bingo card seeding complete!');
}

seedBingoCards()
  .catch((err) => {
    console.error('❌ Error seeding cards:', err)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })