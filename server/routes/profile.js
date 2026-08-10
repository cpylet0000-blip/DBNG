import express from 'express';
import prisma from '../lib/prisma.js';
const router = express.Router();
const MIN_BALANCE_AFTER_TRANSFER = 50;

const getPhoneVariants = (rawPhone = '') => {
    const trimmed = String(rawPhone || '').trim();
    if (!trimmed) return [];

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) return [trimmed];

    const variants = new Set([trimmed, digitsOnly]);

    if (digitsOnly.length === 9 && digitsOnly.startsWith('9')) {
        variants.add(`0${digitsOnly}`);
        variants.add(`251${digitsOnly}`);
        variants.add(`+251${digitsOnly}`);
    }

    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
        const localNoZero = digitsOnly.slice(1);
        variants.add(`251${localNoZero}`);
        variants.add(`+251${localNoZero}`);
    }

    if (digitsOnly.length === 12 && digitsOnly.startsWith('251')) {
        const localNoZero = digitsOnly.slice(3);
        variants.add(`0${localNoZero}`);
        variants.add(`+251${localNoZero}`);
    }

    return [...variants];
};

// Claim rewards endpoint
router.post('/claim-rewards', async (req, res) => {
    if (!req.tgUser)
        return res.status(401).json({ error: 'Invalid or missing Telegram init data' });

    const { id } = req.tgUser;
    const telegramId = String(id);

    try {
        const providedComboCode = typeof req.body?.comboCode === 'string' ? req.body.comboCode.trim() : '';

        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: { balance: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch the active RewardRule (assuming only one active rule)
        const rule = await prisma.rewardRule.findFirst({
            where: { status: 'active' },
            orderBy: { id: 'desc' },
        });

        if (!rule) {
            return res.status(400).json({ error: 'No active challenge rule found' });
        }

        // Enforce combo check when rule has a combo code configured.
        if (rule.comboCode && providedComboCode !== rule.comboCode) {
            return res.status(400).json({ error: 'Invalid combo code.' });
        }

        // Prevent repeated claim of the same rule by the same user.
        const existingClaim = await prisma.reward.findFirst({
            where: {
                userId: user.id,
                ruleId: rule.id,
                status: 'claimed',
            },
            select: { id: true },
        });

        if (existingClaim) {
            return res.status(400).json({ error: 'You already claimed this reward rule.' });
        }

        // Check if reward rule has reached its player limit
        if (rule.totalPlayerForReward > 0 && rule.claimedCount >= rule.totalPlayerForReward) {
            return res.status(400).json({ error: 'Reward limit has been reached. No more claims available.' });
        }

        // Check if user satisfies the challenge rule
        if ((user.numberOfTotalPlay ?? 0) < rule.numberOfGamePlay) {
            return res.status(400).json({ error: `You need to play at least ${rule.numberOfGamePlay} games to claim the challenge reward.` });
        }

        // rewardChallenge is a play-progress counter, so compare to games-to-play target.
        if ((user.rewardChallenge ?? 0) < rule.numberOfGamePlay) {
            return res.status(400).json({ error: `You need at least ${rule.numberOfGamePlay} challenge plays to claim.` });
        }

        // Apply claim atomically: credit user, mark claim, and update rule counters.
        const [, updated] = await prisma.$transaction([
            prisma.reward.create({
                data: {
                    userId: user.id,
                    ruleId: rule.id,
                    numberOfgamePlayed: user.numberOfTotalPlay ?? 0,
                    status: 'claimed',
                },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    rewardBalance: { increment: rule.rewardAmount },
                    rewardChallenge: 0,
                },
            }),
            prisma.rewardRule.update({
                where: { id: rule.id },
                data: {
                    claimedCount: { increment: 1 },
                    // If limit reached, deactivate the rule
                    status: rule.totalPlayerForReward > 0 && (rule.claimedCount + 1) >= rule.totalPlayerForReward ? 'inactive' : rule.status,
                },
            }),
        ]);

        return res.json({
            success: true,
            claimedChallenge: rule.rewardAmount,
            newRewardBalance: updated.rewardBalance
        });
    } catch (err) {
        console.error('Failed to claim rewards', err);
        return res.status(500).json({ error: 'Failed to claim rewards' });
    }
});

// Claim reward plays bonus endpoint
router.post('/claim-reward-plays', async (req, res) => {
    if (!req.tgUser)
        return res.status(401).json({ error: 'Invalid or missing Telegram init data' });

    const { id } = req.tgUser;
    const telegramId = String(id);

    try {
        const user = await prisma.user.findUnique({
            where: { telegramId },
            include: { balance: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.rewardPlay <= 0) {
            return res.status(400).json({ error: 'No reward plays to claim' });
        }

        // Calculate bonus: 20% of reward plays
        const bonusAmount = Math.floor(user.rewardPlay * 0.1);

        // Claim play: add bonus to rewardBalance, then reset rewardPlay
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                rewardPlay: 0,
                rewardBalance: { increment: bonusAmount },
            }
        });

        return res.json({ 
            success: true, 
            claimedPlays: user.rewardPlay,
            bonusAmount,
            newRewardBalance: updated.rewardBalance
        });
    } catch (err) {
        console.error('Failed to claim reward plays', err);
        return res.status(500).json({ error: 'Failed to claim reward plays' });
    }
});

// Send money from current user to another user by phone number
router.post('/send-money', async (req, res) => {
    if (!req.tgUser)
        return res.status(401).json({ error: 'Invalid or missing Telegram init data' });

    const { id } = req.tgUser;
    const telegramId = String(id);

    const receiverPhoneRaw = typeof req.body?.receiverPhone === 'string' ? req.body.receiverPhone.trim() : '';
    const amountRaw = req.body?.amount;
    const amount = Number(amountRaw);

    if (!receiverPhoneRaw) {
        return res.status(400).json({ error: 'Receiver phone number is required' });
    }

    const receiverDigits = receiverPhoneRaw.replace(/\D/g, '');
    if (receiverDigits.length < 9 || receiverDigits.length > 12) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    try {
        const sender = await prisma.user.findUnique({
            where: { telegramId },
            include: { balance: true },
        });

        if (!sender) {
            return res.status(404).json({ error: 'Sender not found' });
        }

        const receiverPhoneVariants = getPhoneVariants(receiverPhoneRaw);
        const senderPhoneVariants = getPhoneVariants(sender.userNumber || '');

        if (senderPhoneVariants.some((phone) => receiverPhoneVariants.includes(phone))) {
            return res.status(400).json({ error: 'You cannot send money to your own phone number' });
        }

        const receiver = await prisma.user.findFirst({
            where: {
                userNumber: {
                    in: receiverPhoneVariants,
                },
            },
            include: { balance: true },
        });

        if (!receiver) {
            return res.status(404).json({ error: 'Receiver not found for this phone number' });
        }

        if (receiver.id === sender.id) {
            return res.status(400).json({ error: 'You cannot send money to yourself' });
        }

        const senderBalance = Number(sender.balance?.currentBalance ?? 0);
        if (senderBalance < roundedAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const remainingBalance = senderBalance - roundedAmount;
        if (remainingBalance < MIN_BALANCE_AFTER_TRANSFER) {
            return res.status(400).json({
                error: `You must keep at least ${MIN_BALANCE_AFTER_TRANSFER} ETB in your current balance after sending money`,
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.userBalance.upsert({
                where: { userId: sender.id },
                create: { userId: sender.id, currentBalance: 0 },
                update: {},
            });

            await tx.userBalance.upsert({
                where: { userId: receiver.id },
                create: { userId: receiver.id, currentBalance: 0 },
                update: {},
            });

            const debitResult = await tx.userBalance.updateMany({
                where: {
                    userId: sender.id,
                    currentBalance: { gte: roundedAmount },
                },
                data: {
                    currentBalance: { decrement: roundedAmount },
                },
            });

            if (debitResult.count !== 1) {
                const err = new Error('Insufficient balance');
                err.status = 400;
                throw err;
            }

            await tx.userBalance.update({
                where: { userId: receiver.id },
                data: {
                    currentBalance: { increment: roundedAmount },
                },
            });

            await tx.transferHistory.create({
                data: {
                    senderId: sender.id,
                    receiverId: receiver.id,
                    amount: roundedAmount,
                },
            });

            const senderUpdated = await tx.userBalance.findUnique({
                where: { userId: sender.id },
                select: { currentBalance: true },
            });

            return {
                senderBalance: Number(senderUpdated?.currentBalance ?? 0),
            };
        });

        return res.json({
            success: true,
            amount: roundedAmount,
            receiver: {
                id: receiver.id,
                name: receiver.name || receiver.username || 'User',
                userNumber: receiver.userNumber,
            },
            senderBalance: result.senderBalance,
        });
    } catch (err) {
        if (err?.status === 400) {
            return res.status(400).json({ error: err.message || 'Insufficient balance' });
        }

        console.error('Failed to send money', err);
        return res.status(500).json({ error: 'Failed to send money' });
    }
});

export default router;
