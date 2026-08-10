import express from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// Get user's active invitations
router.get('/invitations', async (req, res) => {
  try {
    console.log('[INVITATION DEBUG] req.tgUser:', req.tgUser);
    if (!req.tgUser?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const telegramId = String(req.tgUser.id);
    console.log('[INVITATION DEBUG] Querying telegramId:', telegramId);
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { activeInvitation: true }
    });

    console.log('[INVITATION DEBUG] User record:', user);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ activeInvitations: user.activeInvitation || 0 });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Claim invitation rewards
router.post('/invitations/claim', async (req, res) => {
  try {
    if (!req.tgUser?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: String(req.tgUser.id) },
      select: { 
        id: true, 
        activeInvitation: true,
        userNumber: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.userNumber) {
      return res.status(400).json({ error: 'Phone number required to claim rewards' });
    }

    if (user.activeInvitation <= 0) {
      return res.status(400).json({ error: 'No active invitations to claim' });
    }

    const rewardAmount = user.activeInvitation * 0;

    // Reward balance lives on User model, so update User directly and reset active invitations.
    await prisma.user.update({
      where: { telegramId: String(req.tgUser.id) },
      data: {
        rewardBalance: { increment: rewardAmount },
        activeInvitation: 0
      }
    });

    res.json({ 
      message: `Successfully claimed ${rewardAmount} ETB!`,
      rewardAmount,
      claimedInvitations: user.activeInvitation
    });
  } catch (error) {
    console.error('Error claiming invitations:', error);
    res.status(500).json({ error: 'Failed to claim rewards' });
  }
});

export default router;
