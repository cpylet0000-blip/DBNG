import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all stake bonuses
export const getStakeBonuses = async (req, res) => {
  try {
    const stakeBonuses = await prisma.stakeBonus.findMany({
      orderBy: { stake: 'asc' }
    });

    res.status(200).json({
      success: true,
      bonuses: stakeBonuses
    });
  } catch (error) {
    console.error('Error fetching stake bonuses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stake bonuses' 
    });
  }
};

// UPDATE stake bonus
export const updateStakeBonus = async (req, res) => {
  try {
    const { stake } = req.params;
    const { bonusAmount, enabled } = req.body;

    if (!stake || isNaN(stake)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stake amount'
      });
    }

    if (typeof bonusAmount !== 'number' || bonusAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonus amount'
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid enabled status'
      });
    }

    const stakeBonus = await prisma.stakeBonus.upsert({
      where: { stake: parseInt(stake) },
      update: {
        bonusAmount,
        enabled
      },
      create: {
        stake: parseInt(stake),
        bonusAmount,
        enabled
      }
    });

    res.status(200).json({
      success: true,
      bonus: stakeBonus
    });
  } catch (error) {
    console.error('Error updating stake bonus:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update stake bonus' 
    });
  }
};

// UPDATE multiple stake bonuses at once
export const updateAllStakeBonuses = async (req, res) => {
  try {
    const { bonuses } = req.body;

    if (!Array.isArray(bonuses)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonuses data'
      });
    }

    const updatedBonuses = [];

    for (const bonusData of bonuses) {
      const { stake, bonusAmount, enabled } = bonusData;

      if (!stake || isNaN(stake) || typeof bonusAmount !== 'number' || bonusAmount < 0 || typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: `Invalid data for stake ${stake}`
        });
      }

      const stakeBonus = await prisma.stakeBonus.upsert({
        where: { stake: parseInt(stake) },
        update: {
          bonusAmount,
          enabled
        },
        create: {
          stake: parseInt(stake),
          bonusAmount,
          enabled
        }
      });

      updatedBonuses.push(stakeBonus);
    }

    res.status(200).json({
      success: true,
      bonuses: updatedBonuses
    });
  } catch (error) {
    console.error('Error updating all stake bonuses:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update stake bonuses' 
    });
  }
};

export default async function handler(req, res) {
  console.log('🔥 [BACKEND] Admin stake bonuses API called!');
  console.log('📝 [BACKEND] Request method:', req.method);
  console.log('🕐 [BACKEND] Request timestamp:', new Date().toISOString());

  switch (req.method) {
    case 'GET':
      return getStakeBonuses(req, res);
    case 'PUT':
      return updateAllStakeBonuses(req, res);
    default:
      console.log('❌ [BACKEND] Method not allowed:', req.method);
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
  }
}
