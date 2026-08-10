import express from 'express';
import { 
  getLotteryTicketsForDraw, 
  drawPrizeWinner, 
  getDrawStatus, 
  completeDraw 
} from '../service/adminStepByStepDrawService.js';
import { adminAuthMiddleware } from '../lib/auth/adminMiddleware.js';

const router = express.Router();

/**
 * Middleware to check admin authentication
 */
router.use(adminAuthMiddleware);

/**
 * Get all tickets for a lottery draw
 */
router.get('/:lotteryId/tickets', async (req, res) => {
  try {
    const { lotteryId } = req.params;
    
    const tickets = await getLotteryTicketsForDraw(lotteryId);
    
    res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error('[AdminStepByStepDrawRoutes] Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
    });
  }
});

/**
 * Get current draw status
 */
router.get('/:lotteryId/status', async (req, res) => {
  try {
    const { lotteryId } = req.params;
    
    const status = await getDrawStatus(lotteryId);
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[AdminStepByStepDrawRoutes] Error getting draw status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draw status',
    });
  }
});

/**
 * Draw winner for specific prize
 */
router.post('/:lotteryId/draw/:prizePosition', async (req, res) => {
  try {
    const { lotteryId, prizePosition } = req.params;
    const position = parseInt(prizePosition);
    
    if (position < 1 || position > 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid prize position. Must be 1, 2, or 3',
      });
    }

    // Get current status to check available tickets
    const status = await getDrawStatus(lotteryId);
    
    if (status.winners.some(w => w.prizePosition === position)) {
      return res.status(400).json({
        success: false,
        error: `Prize ${position} has already been drawn`,
      });
    }

    const winner = await drawPrizeWinner(lotteryId, position, status.availableTickets);
    
    res.json({
      success: true,
      data: winner,
      message: `${position === 1 ? 'First' : position === 2 ? 'Second' : 'Third'} prize winner drawn successfully`,
    });
  } catch (error) {
    console.error('[AdminStepByStepDrawRoutes] Error drawing prize:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to draw prize winner',
    });
  }
});

/**
 * Complete the draw process
 */
router.post('/:lotteryId/complete', async (req, res) => {
  try {
    const { lotteryId } = req.params;
    
    await completeDraw(lotteryId);
    
    res.json({
      success: true,
      message: 'Draw completed successfully',
    });
  } catch (error) {
    console.error('[AdminStepByStepDrawRoutes] Error completing draw:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete draw',
    });
  }
});

export default router;
