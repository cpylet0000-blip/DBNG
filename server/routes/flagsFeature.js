import express from 'express';
import { getFlags, setWithdrawLock, setDepositMethodActive, updateDepositMethod } from '../service/flagsFeatureService.js';
import { adminAuthMiddleware } from '../lib/auth/adminMiddleware.js';

const router = express.Router();

router.get('/flags', adminAuthMiddleware, async (req, res) => {
  try {
    const flags = await getFlags();
    res.json({ success: true, ...flags });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch flags' });
  }
});

router.post('/flags/withdraw', adminAuthMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    const lock = await setWithdrawLock(isActive);
    res.json({ success: true, lock });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update withdraw lock' });
  }
});

router.post('/flags/deposit-method/:id/active', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const method = await setDepositMethodActive(Number(id), isActive);
    res.json({ success: true, method });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update deposit method' });
  }
});

router.post('/flags/deposit-method/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const method = await updateDepositMethod(Number(id), data);
    res.json({ success: true, method });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update deposit method' });
  }
});

export default router;
