const express = require('express');
const router = express.Router();
const { drawLotteryWinners, getLotteryWinners, getAllLotteriesWithWinners } = require('../service/lotteryDrawService');

/**
 * POST /api/lottery-draw/:lotteryId/draw
 * Draw winners for a specific lottery (Admin only)
 */
router.post('/:lotteryId/draw', async (req, res) => {
  try {
    const { lotteryId } = req.params;
    
    // TODO: Add admin authentication check here
    // For now, we'll proceed without admin check (add later)
    
    const winners = await drawLotteryWinners(lotteryId);
    
    res.json({
      success: true,
      message: 'Winners drawn successfully',
      data: winners,
    });
  } catch (error) {
    console.error('[LotteryDrawRoutes] Error drawing winners:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/lottery-draw/:lotteryId/winners
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
    console.error('[LotteryDrawRoutes] Error getting winners:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/lottery-draw/all
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
    console.error('[LotteryDrawRoutes] Error getting all lotteries:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
