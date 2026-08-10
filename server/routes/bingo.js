/**
 * New Bingo REST API Routes
 * HTTP endpoints for card selection and session info
 */

import express from "express";
import * as bingoRoomService from "../service/bingoRoomService.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

/**
 * GET /api/bingo/cards/:stake
 * Get available cards for a stake
 */
router.get("/cards/:stake", async (req, res) => {
  try {
    const stake = parseInt(req.params.stake);
    const roomNumber = req.query.room ? parseInt(req.query.room, 10) : 1;

    if (![10, 20, 50, 100].includes(stake)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stake. Must be 10, 20, 50, or 100",
      });
    }

    // Check if user is banned
    let canPlay = null;
    let balance = null;
    try {
      if (req.tgUser?.id) {
        const user = await prisma.user.findUnique({
          where: { telegramId: String(req.tgUser.id) },
        });
        if (user) {
          if (user.banned) {
            return res.status(403).json({
              success: false,
              error: "You have been banned and cannot play games",
            });
          }
          const userBalance = await prisma.userBalance.findUnique({
            where: { userId: user.id },
          });
          balance = userBalance?.currentBalance ?? 0;
          canPlay = Number(balance) >= stake;
        } else {
          canPlay = false;
        }
      }
    } catch (e) {
      // Non-fatal; omit canPlay/balance on error
      canPlay = null;
      balance = null;
    }

    const cards = await bingoRoomService.getAvailableCards(stake, roomNumber);
    const session = await bingoRoomService.getOrCreateSession(
      stake,
      roomNumber,
    );

    res.json({
      success: true,
      cards,
      session,
      canPlay,
      balance,
    });
  } catch (error) {
    console.error("Error getting cards:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/bingo/select-card
 * Select a card
 * Body: { stake: number, cardId: number }
 */
router.post("/select-card", async (req, res) => {
  if (!req.tgUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { stake, cardId } = req.body;
    const telegramId = String(req.tgUser.id);

    // Get database user ID from Telegram ID
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userId = user.id;

    if (![10, 20, 50, 100].includes(stake)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stake",
      });
    }

    if (!cardId || cardId < 1 || cardId > 200) {
      return res.status(400).json({
        success: false,
        error: "Invalid cardId. Must be 1-200",
      });
    }

    const player = await bingoRoomService.selectCard(stake, userId, cardId);
    const session = await bingoRoomService.getSessionDetails(
      stake,
      player.roomNumber,
    );

    res.json({
      success: true,
      player,
      session,
    });
  } catch (error) {
    console.error("Error selecting card:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/bingo/select-multiple-cards
 * Select multiple cards (up to 10) - OPTIMIZED
 * Body: { stake: number, cardIds: number[] }
 */
router.post("/select-multiple-cards", async (req, res) => {
  if (!req.tgUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { stake, cardIds } = req.body;
  const telegramId = String(req.tgUser.id);

  // Get database user ID from Telegram ID
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const userId = user.id;

  // Validate input
  if (!stake || !cardIds || !Array.isArray(cardIds)) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body",
    });
  }

  if (![10, 20, 50, 100].includes(stake)) {
    return res.status(400).json({
      success: false,
      error: "Invalid stake. Must be 10, 20, 50, or 100",
    });
  }

  if (cardIds.length === 0 || cardIds.length > 10) {
    return res.status(400).json({
      success: false,
      error: "Invalid cardIds length. Must be 1-10 cards",
    });
  }

  for (const cardId of cardIds) {
    if (!Number.isInteger(cardId) || cardId < 1 || cardId > 200) {
      return res.status(400).json({
        success: false,
        error: "Invalid cardId. Must be 1-200",
      });
    }
  }

  try {
    // Use the optimized batch function
    const players = await bingoRoomService.selectMultipleCards(
      stake,
      userId,
      cardIds,
    );

    // Get session details
    const roomNumber = players[0]?.roomNumber || 1;
    const session = await bingoRoomService.getSessionDetails(stake, roomNumber);

    res.json({
      success: true,
      players,
      session,
    });
  } catch (error) {
    console.error("Error selecting multiple cards:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/bingo/session/:stake
 * Get session details for a stake
 */
router.get("/session/:stake", async (req, res) => {
  try {
    const stake = parseInt(req.params.stake);
    const roomNumber = req.query.room ? parseInt(req.query.room, 10) : 1;

    if (![10, 20, 50, 100].includes(stake)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stake",
      });
    }

    const session = await bingoRoomService.getSessionDetails(stake, roomNumber);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error getting session:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/bingo/session/:stake/finish
 * Force mark a live session as finished (admin tooling)
 */
router.patch("/session/:stake/finish", async (req, res) => {
  try {
    const stake = parseInt(req.params.stake, 10);
    const roomNumber = req.query.room ? parseInt(req.query.room, 10) : 1;

    if (![10, 20, 50, 100].includes(stake)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stake",
      });
    }

    const result = await bingoRoomService.forceFinishSessionWithRefund(
      stake,
      roomNumber,
    );

    res.json({
      success: true,
      session: result.session,
      refunded: {
        players: result.refundedPlayers,
        cards: result.refundedCards,
        amount: result.refundedAmount,
      },
      alreadyFinished: result.alreadyFinished,
    });
  } catch (error) {
    console.error("Error finishing session:", error);
    if (error.message === "Session not found") {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/bingo/leave-active-game
 * Leave current active game to join another stake
 */
router.post("/leave-active-game", async (req, res) => {
  if (!req.tgUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userId = parseInt(req.tgUser.id, 10);

    // Get database user ID
    const user = await prisma.user.findUnique({
      where: { telegramId: String(userId) },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const leftGame = await bingoRoomService.leaveActiveGame(user.id);

    if (leftGame) {
      res.json({
        success: true,
        message: "Left active game successfully",
      });
    } else {
      res.json({
        success: false,
        error: "No active game found",
      });
    }
  } catch (error) {
    console.error("Error leaving active game:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
