import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log('🔥 [BACKEND] Stake bonuses API called!');
  console.log('📝 [BACKEND] Request method:', req.method);
  console.log('🕐 [BACKEND] Request timestamp:', new Date().toISOString());
  // Log query parameters if any
  if (req.method !== 'GET') {
    console.log('❌ [BACKEND] Method not allowed:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('💾 [BACKEND] Querying database for stake bonuses...');
    const stakeBonuses = await prisma.stakeBonus.findMany({
      orderBy: { stake: 'asc' }
    });


    res.status(200).json({
      success: true,
      bonuses: stakeBonuses
    });
  } catch (error) {
    console.error('💥 [BACKEND] Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stake bonuses' 
    });
  } finally {
    console.log('🔌 [BACKEND] Closing database connection');
    await prisma.$disconnect();
  }
}
