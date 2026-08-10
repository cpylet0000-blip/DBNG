import express from 'express';
import { drawLotteryWinners, getLotteryWinners, getAllLotteriesWithWinners } from '../service/adminLotteryDrawService.js';
import { adminAuthMiddleware } from '../lib/auth/adminMiddleware.js';
const router = express.Router();

/**
 * Middleware to check admin authentication
 */
router.use(adminAuthMiddleware);

/**
 * POST /api/admin/lottery-draw/:lotteryId/draw
 * Draw winners for a specific lottery (Admin only)
 */
router.post('/:lotteryId/draw', async (req, res) => {
  try {
    const { lotteryId } = req.params;
    
    const winners = await drawLotteryWinners(lotteryId);
    
    res.json({
      success: true,
      message: 'Winners drawn successfully',
      data: winners,
    });
  } catch (error) {
    console.error('[AdminLotteryDrawRoutes] Error drawing winners:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/lottery-draw/:lotteryId/winners
 * Get winners for a specific lottery
 */
router.get('/:lotteryId/winners', async (req, res) => {
  try {
    const { lotteryId } = req.params;
    
    const winners = await getLotteryWinners(lotteryId);
    
    res.json({
      success: true,
      data: winners,
    });
  } catch (error) {
    console.error('[AdminLotteryDrawRoutes] Error getting winners:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/lottery-draw/all
 * Get all lotteries with their winners
 */
router.get('/all', async (req, res) => {
  try {
    const lotteries = await getAllLotteriesWithWinners();
    
    res.json({
      success: true,
      data: lotteries,
    });
  } catch (error) {
    console.error('[AdminLotteryDrawRoutes] Error getting all lotteries:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
