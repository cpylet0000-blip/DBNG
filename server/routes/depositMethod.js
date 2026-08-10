// DepositMethod API routes
import express from 'express';
import { PrismaClient } from '@prisma/client';
const router = express.Router();
const prisma = new PrismaClient();

// Get all deposit methods
router.get('/', async (req, res) => {
  const methods = await prisma.depositMethod.findMany();
  res.json({ methods });
});


// Get withdraw lock status
router.get('/withdraw-lock', async (req, res) => {
  const lock = await prisma.withdrawLock.findFirst();
  res.json({ isActive: lock?.isActive ?? true });
});

export default router;
