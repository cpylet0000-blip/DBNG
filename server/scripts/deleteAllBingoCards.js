import prisma from '../lib/prisma.js';

async function deleteAllBingoCards() {
  try {
    console.log('🗑️ Deleting all rows in the BingoCard table...');
    await prisma.bingoCard.deleteMany({});
    console.log('✅ All rows deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting rows:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllBingoCards();