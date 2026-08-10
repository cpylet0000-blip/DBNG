/**
 * Bingo Health Check Routes
 * Provides endpoints for monitoring game health
 */

import express from 'express';
import * as healthCheck from '../service/bingoHealthCheck.js';

const router = express.Router();

// Get overall health status
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.getHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game statistics
router.get('/health/stats', async (req, res) => {
  try {
    const stats = await healthCheck.getGameStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find stuck active games
router.get('/health/stuck-games', async (req, res) => {
  try {
    const stuckGames = await healthCheck.findStuckActiveGames();
    res.json({ stuckGames, count: stuckGames.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find stuck countdowns
router.get('/health/stuck-countdowns', async (req, res) => {
  try {
    const stuckCountdowns = await healthCheck.findStuckCountdowns();
    res.json({ stuckCountdowns, count: stuckCountdowns.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve stuck game (admin only - add auth middleware if needed)
router.post('/health/resolve-game/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await healthCheck.resolveStuckGame(parseInt(sessionId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve stuck countdown (admin only - add auth middleware if needed)
router.post('/health/resolve-countdown/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await healthCheck.resolveStuckCountdown(parseInt(sessionId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up empty sessions (admin only)
router.post('/health/cleanup-empty', async (req, res) => {
  try {
    const result = await healthCheck.cleanupEmptySessions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
