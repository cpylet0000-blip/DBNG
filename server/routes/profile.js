import express from 'express';
import prisma from '../lib/prisma.js';
import { claimRewardCombo } from '../service/rewardService.js';
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

    const telegramId = String(req.tgUser.id);
    const providedComboCode = typeof req.body?.comboCode === 'string' ? req.body.comboCode.trim() : '';

    try {
        const result = await claimRewardCombo(telegramId, providedComboCode, {
            username: req.tgUser.username || null,
            name: [req.tgUser.first_name, req.tgUser.last_name].filter(Boolean).join(' ') || null,
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        return res.json({
            success: true,
            claimedAmount: result.claimedAmount,
            newRewardBalance: result.newRewardBalance,
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
