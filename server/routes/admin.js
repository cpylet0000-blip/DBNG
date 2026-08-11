import express from "express";
import { getSummary } from "../service/earningsService.js";
import { adminAuthMiddleware } from "../lib/auth/adminMiddleware.js";
import prisma from "../lib/prisma.js";
import { getRuntimeBot } from "../lib/bot/runtimeBot.js";
import demoBotConfig from "../lib/demoBotConfig.js";

import { getLeaderboardPeriodStart } from "../service/leaderboardService.js";
import {
  getPendingRequests,
  getAllRequests,
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
} from "../service/adminRequestsService.js";

const router = express.Router();

// Apply adminAuthMiddleware to all admin routes
router.use(adminAuthMiddleware);

const LEADERBOARD_TYPES = ["PLAY", "INVITATION"];
const LEADERBOARD_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "TOTAL"];
const LEADERBOARD_RESET_SCOPES = ["CURRENT", "ALL_HISTORY"];
const EXCLUDED_REWARD_USER_IDS = [99, 116, 80, 135];
const REWARD_BALANCE_TARGETS = ["CURRENT", "REWARD"];
const MAX_REWARD_AMOUNT = 500;

const toDisplayName = (user) =>
  user?.name || user?.username || `User ${user?.id ?? ""}`.trim();

const formatRewardAmount = (amount) => {
  const asNumber = Number(amount);
  if (!Number.isFinite(asNumber)) return "0";
  return Number.isInteger(asNumber) ? String(asNumber) : asNumber.toFixed(2);
};

// POST /admin/leaderboard/reset - reset leaderboard values to 0 by type/period.
// body: { period: DAILY|WEEKLY|MONTHLY|TOTAL, type: PLAY|INVITATION|ALL, scope?: CURRENT|ALL_HISTORY }
router.post("/leaderboard/reset", adminAuthMiddleware, async (req, res) => {
  const period = String(req.body?.period || "").toUpperCase();
  const type = String(req.body?.type || "").toUpperCase();
  const scope = String(req.body?.scope || "CURRENT").toUpperCase();

  if (!LEADERBOARD_PERIODS.includes(period)) {
    return res.status(400).json({
      success: false,
      error: "Invalid period. Use DAILY, WEEKLY, MONTHLY, or TOTAL.",
    });
  }

  if (type !== "ALL" && !LEADERBOARD_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: "Invalid type. Use PLAY, INVITATION, or ALL.",
    });
  }

  if (!LEADERBOARD_RESET_SCOPES.includes(scope)) {
    return res.status(400).json({
      success: false,
      error: "Invalid scope. Use CURRENT or ALL_HISTORY.",
    });
  }

  try {
    const where = {
      period,
      ...(type === "ALL" ? {} : { type }),
      ...(scope === "CURRENT"
        ? { periodStart: getLeaderboardPeriodStart(period) }
        : {}),
    };

    const result = await prisma.userLeaderboardStat.updateMany({
      where,
      data: { value: 0 },
    });

    return res.json({
      success: true,
      message: `Reset ${result.count} leaderboard rows`,
      reset: {
        period,
        type,
        scope,
        updatedRows: result.count,
      },
    });
  } catch (err) {
    console.error("Failed to reset leaderboard stats", err);
    return res.status(500).json({
      success: false,
      error: "Failed to reset leaderboard stats",
    });
  }
});

// --- REWARD RULE MANAGEMENT ENDPOINTS ---
// POST /admin/rewards - create/set a reward rule
router.post("/rewards", async (req, res) => {
  const { noplayForReward, amount, count, comboCode } = req.body;
  const normalizedComboCode =
    typeof comboCode === "string" ? comboCode.trim() : "";
  if (
    typeof noplayForReward !== "number" ||
    noplayForReward < 1 ||
    typeof amount !== "number" ||
    amount < 0 ||
    typeof count !== "number" ||
    count < 1 ||
    !normalizedComboCode
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid reward rule data" });
  }
  try {
    const rule = await prisma.rewardRule.create({
      data: {
        numberOfGamePlay: noplayForReward,
        rewardAmount: amount,
        totalPlayerForReward: count,
        comboCode: normalizedComboCode,
        status: "active",
      },
    });
    res.json({ success: true, rule });
  } catch (err) {
    console.error("Failed to create reward rule", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to create reward rule" });
  }
});

// GET /admin/rewards - list all reward rules
router.get("/rewards", adminAuthMiddleware, async (_req, res) => {
  try {
    const rewards = await prisma.rewardRule.findMany({
      orderBy: { id: "desc" },
    });
    res.json({ success: true, rewards });
  } catch (err) {
    console.error("Failed to fetch reward rules", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch reward rules" });
  }
});

// GET /admin/rewards/:id/claims - list rewarded users for a specific reward rule
router.get("/rewards/:id/claims", adminAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!id)
    return res.status(400).json({ success: false, error: "Invalid rule id" });

  try {
    const rule = await prisma.rewardRule.findUnique({ where: { id } });
    if (!rule) {
      return res
        .status(404)
        .json({ success: false, error: "Reward rule not found" });
    }

    const claims = await prisma.reward.findMany({
      where: {
        ruleId: id,
        status: "claimed",
      },
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            name: true,
            username: true,
            userNumber: true, // This is the phone number
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = claims.map((claim) => ({
      rewardId: claim.id,
      userId: claim.userId,
      telegramId: claim.user?.telegramId || null,
      name: claim.user?.name || claim.user?.username || `User ${claim.userId}`,
      phone: claim.user?.userNumber || null,
      amount: rule.rewardAmount,
      claimedAt: claim.createdAt,
    }));

    return res.json({
      success: true,
      rule: {
        id: rule.id,
        numberOfGamePlay: rule.numberOfGamePlay,
        rewardAmount: rule.rewardAmount,
        totalPlayerForReward: rule.totalPlayerForReward,
        claimedCount: rule.claimedCount,
        comboCode: rule.comboCode || null,
        status: rule.status,
      },
      claims: items,
    });
  } catch (err) {
    console.error("Failed to fetch reward claims", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch reward claims" });
  }
});

// DELETE /admin/rewards/inactive - delete all inactive reward rules and their claim rows
router.delete("/rewards/inactive", adminAuthMiddleware, async (_req, res) => {
  try {
    const inactiveRules = await prisma.rewardRule.findMany({
      where: { status: "inactive" },
      select: { id: true },
    });

    if (inactiveRules.length === 0) {
      return res.json({
        success: true,
        deletedRules: 0,
        deletedClaims: 0,
      });
    }

    const ruleIds = inactiveRules.map((r) => r.id);

    const [deletedClaims, deletedRules] = await prisma.$transaction([
      prisma.reward.deleteMany({
        where: { ruleId: { in: ruleIds } },
      }),
      prisma.rewardRule.deleteMany({
        where: { id: { in: ruleIds }, status: "inactive" },
      }),
    ]);

    return res.json({
      success: true,
      deletedRules: deletedRules.count,
      deletedClaims: deletedClaims.count,
    });
  } catch (err) {
    console.error("Failed to delete inactive reward rules", err);
    return res.status(500).json({
      success: false,
      error: "Failed to delete inactive reward rules",
    });
  }
});

// PATCH /admin/rewards/:id/stop - deactivate a reward rule
router.patch("/rewards/:id/stop", adminAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!id)
    return res.status(400).json({ success: false, error: "Invalid rule id" });
  try {
    const updated = await prisma.rewardRule.update({
      where: { id },
      data: { status: "inactive" },
    });
    res.json({ success: true, rule: updated });
  } catch (err) {
    console.error("Failed to stop reward rule", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to stop reward rule" });
  }
});

// DELETE /admin/rewards/:id - delete a reward rule (active or inactive) and its claims
router.delete("/rewards/:id", adminAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (!id)
    return res.status(400).json({ success: false, error: "Invalid rule id" });

  try {
    const rule = await prisma.rewardRule.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!rule) {
      return res
        .status(404)
        .json({ success: false, error: "Reward rule not found" });
    }

    const [deletedClaims] = await prisma.$transaction([
      prisma.reward.deleteMany({ where: { ruleId: id } }),
      prisma.rewardRule.delete({ where: { id } }),
    ]);

    return res.json({
      success: true,
      deletedRuleId: id,
      deletedClaims: deletedClaims.count,
      deletedStatus: rule.status,
    });
  } catch (err) {
    console.error("Failed to delete reward rule", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete reward rule" });
  }
});
// GET /admin/reward-players/top?limit=25
// Return top contributors from leaderboard stats for selected period.
router.get("/reward-players/top", adminAuthMiddleware, async (req, res) => {
  const parsedLimit = Number(req.query.limit);
  const limit = Math.min(
    Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 25, 1),
    100,
  );
  const period = String(req.query.period || "TOTAL").toUpperCase();
  const leaderboardType = String(req.query.type || "PLAY").toUpperCase();

  if (!LEADERBOARD_PERIODS.includes(period)) {
    return res.status(400).json({
      success: false,
      error: "Invalid period. Use DAILY, WEEKLY, MONTHLY, or TOTAL.",
    });
  }

  if (!LEADERBOARD_TYPES.includes(leaderboardType)) {
    return res.status(400).json({
      success: false,
      error: "Invalid type. Use PLAY or INVITATION.",
    });
  }

  try {
    const statsRows = await prisma.userLeaderboardStat.findMany({
      where: {
        userId: { notIn: EXCLUDED_REWARD_USER_IDS },
        period,
        type: leaderboardType,
      },
      orderBy: { value: "desc" },
      take: limit,
      select: {
        userId: true,
        value: true,
        user: {
          select: {
            id: true,
            telegramId: true,
            name: true,
            username: true,
            rewardBalance: true,
            balance: {
              select: {
                currentBalance: true,
              },
            },
          },
        },
      },
    });

    const ranking = statsRows.map((row, index) => {
      const selectedScore = Number(row.value || 0);
      return {
        rank: index + 1,
        userId: row.user.id,
        telegramId: row.user.telegramId,
        name: toDisplayName(row.user),
        playCount: leaderboardType === "PLAY" ? selectedScore : 0,
        inviteCount: leaderboardType === "INVITATION" ? selectedScore : 0,
        selectedScore,
        contribution: selectedScore,
        currentBalance: Number(row.user.balance?.currentBalance || 0),
        rewardBalance: Number(row.user.rewardBalance || 0),
      };
    });

    return res.json({
      success: true,
      period,
      type: leaderboardType,
      users: ranking,
    });
  } catch (err) {
    console.error("Failed to fetch top contributors", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch top contributors" });
  }
});

// POST /admin/reward-players/reward
// body: { userId: number, amount: number, target: CURRENT|REWARD, message?: string }
router.post("/reward-players/reward", adminAuthMiddleware, async (req, res) => {
  const userId = Number(req.body?.userId);
  const amount = Number(req.body?.amount);
  const target = String(req.body?.target || "CURRENT").toUpperCase();
  const customMessage =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ success: false, error: "Invalid userId" });
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_REWARD_AMOUNT) {
    return res.status(400).json({
      success: false,
      error: `Amount must be between 1 and ${MAX_REWARD_AMOUNT}`,
    });
  }

  if (!REWARD_BALANCE_TARGETS.includes(target)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid target. Use CURRENT or REWARD" });
  }

  if (target === "REWARD" && !Number.isInteger(amount)) {
    return res.status(400).json({
      success: false,
      error: "Reward balance accepts integer amounts only",
    });
  }

  try {
    const payload = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          balance: {
            select: {
              currentBalance: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const beforeCurrent = Number(user.balance?.currentBalance || 0);
      const beforeReward = Number(user.rewardBalance || 0);
      let afterCurrent = beforeCurrent;
      let afterReward = beforeReward;

      if (target === "CURRENT") {
        const hasBalance = Boolean(user.balance);
        if (!hasBalance) {
          await tx.userBalance.create({ data: { userId } });
        }

        const updatedBalance = await tx.userBalance.update({
          where: { userId },
          data: {
            currentBalance: {
              increment: amount,
            },
          },
          select: {
            currentBalance: true,
          },
        });

        afterCurrent = Number(updatedBalance.currentBalance || 0);
      } else {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            rewardBalance: {
              increment: amount,
            },
          },
          select: {
            rewardBalance: true,
          },
        });

        afterReward = Number(updatedUser.rewardBalance || 0);
      }

      return {
        user,
        beforeCurrent,
        afterCurrent,
        beforeReward,
        afterReward,
      };
    });

    const user = payload.user;
    const displayName = toDisplayName(user);
    const amountText = formatRewardAmount(amount);
    const balanceLabel =
      target === "CURRENT" ? "current balance" : "reward balance";
    const supportUrl =
      process.env.VITE_TG_SUPPORT_BOT_URL ||
      process.env.VITE_TG_BOT_URL ||
      process.env.TG_SUPPORT_BOT_URL ||
      "https://t.me/AbolBingoSuport";
    const playNowUrl = process.env.WEB_APP_URL || "";
    const ctaSuffix = "\n";
    const autoMessage = `Congratulations! You received ${amountText} ETB to your ${balanceLabel}.${ctaSuffix}`;
    const messageText = customMessage
      ? `${customMessage}${ctaSuffix}`
      : autoMessage;

    let notified = false;
    let notifyError = null;
    const bot = getRuntimeBot();

    if (bot && user.telegramId) {
      try {
        const inlineKeyboard = [];
        if (playNowUrl) {
          inlineKeyboard.push([
            { text: "▶️ Play Now", web_app: { url: playNowUrl } },
          ]);
        }
        inlineKeyboard.push([{ text: "💬 Get support", url: supportUrl }]);

        await bot.sendMessage(user.telegramId, messageText, {
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        });
        notified = true;
      } catch (err) {
        notifyError = err?.message || "Failed to send Telegram message";
      }
    } else {
      notifyError = "Telegram bot is unavailable";
    }

    return res.json({
      success: true,
      reward: {
        userId: user.id,
        telegramId: user.telegramId,
        name: displayName,
        target,
        amount,
        beforeCurrentBalance: payload.beforeCurrent,
        afterCurrentBalance: payload.afterCurrent,
        beforeRewardBalance: payload.beforeReward,
        afterRewardBalance: payload.afterReward,
      },
      notification: {
        sent: notified,
        error: notifyError,
      },
    });
  } catch (err) {
    if (err?.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    console.error("Failed to reward player", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to reward player" });
  }
});
// POST /admin/reset-reward-challenges - reset user's reward challenges to 0
router.post(
  "/reset-reward-challenges",
  adminAuthMiddleware,
  async (req, res) => {
    const { userId } = req.body;
    if (!userId || typeof userId !== "number" || userId < 1) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { rewardChallenge: 0 },
      });

      res.json({
        success: true,
        message: `User ${userId}'s reward challenges reset to 0`,
        user: {
          id: updatedUser.id,
          rewardChallenge: updatedUser.rewardChallenge,
        },
      });
    } catch (err) {
      console.error("Failed to reset reward challenges", err);
      if (err.code === "P2025") {
        res.status(404).json({ success: false, error: "User not found" });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Failed to reset reward challenges" });
      }
    }
  },
);
router.get("/earnings", adminAuthMiddleware, async (_req, res) => {
  try {
    const summary = await getSummary();
    res.json({ success: true, summary });
  } catch (err) {
    console.error("Failed to load earnings summary", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to load earnings summary" });
  }
});

// Admin: financial earnings summary (deposits/withdrawals/balances)
router.get("/earnings/financial", adminAuthMiddleware, async (_req, res) => {
  try {
    const [balancesAgg, depositsAgg, withdrawalsAgg] = await Promise.all([
      prisma.userBalance.aggregate({
        _sum: { currentBalance: true },
      }),
      prisma.depositRequest.aggregate({
        where: { status: "approved" },
        _sum: { amount: true },
      }),
      prisma.withdrawRequest.aggregate({
        where: { status: "approved" },
        _sum: { amount: true },
      }),
    ]);

    const totalCurrentBalance = Number(balancesAgg?._sum?.currentBalance || 0);
    const totalApprovedDeposits = Number(depositsAgg?._sum?.amount || 0);
    const totalApprovedWithdrawals = Number(withdrawalsAgg?._sum?.amount || 0);

    // House retained = deposits - withdrawals - outstanding user balances
    const totalEarning =
      totalApprovedDeposits - totalApprovedWithdrawals - totalCurrentBalance;

    res.json({
      success: true,
      totals: {
        totalCurrentBalance,
        totalApprovedDeposits,
        totalApprovedWithdrawals,
        totalEarning,
      },
    });
  } catch (err) {
    console.error("Failed to load financial earnings summary", err);
    res.status(500).json({
      success: false,
      error: "Failed to load financial earnings summary",
    });
  }
});
// POST /logout_admin - clear admin auth cookie
router.post("/logout_admin", (req, res) => {
  res.clearCookie("admin_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.json({ success: true });
});
router.patch("/games/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["ACTIVE", "PAUSED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }
  try {
    const updated = await prisma.game.update({
      where: { id: Number(id) },
      data: { status },
    });
    res.json({ game: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update game status" });
  }
});

// Admin: list users with balance information
router.get("/users", adminAuthMiddleware, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        balance: true,
        bingoSessions: {
          where: {
            session: {
              status: {
                in: ["active", "countdown", "waiting"],
              },
            },
          },
          orderBy: { joinedAt: "desc" },
          take: 1,
          select: {
            joinedAt: true,
            cardId: true,
            session: {
              select: {
                id: true,
                stake: true,
                roomNumber: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const usersWithActiveGame = users.map((user) => {
      const latestGame = user.bingoSessions[0] || null;
      return {
        ...user,
        activeGame: latestGame
          ? {
              sessionId: latestGame.session.id,
              stake: latestGame.session.stake,
              roomNumber: latestGame.session.roomNumber,
              status: latestGame.session.status,
              joinedAt: latestGame.joinedAt,
              cardId: latestGame.cardId,
            }
          : null,
      };
    });

    res.json({ success: true, users: usersWithActiveGame });
  } catch (err) {
    console.error("Failed to load users", err);
    res.status(500).json({ success: false, error: "Failed to load users" });
  }
});

// Admin: reset numberOfTotalPlay to 0 for a user
router.post(
  "/users/:id/reset-total-play",
  adminAuthMiddleware,
  async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid user id",
      });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { numberOfTotalPlay: 0 },
      });

      return res.json({
        success: true,
        message: "numberOfTotalPlay reset to 0",
        user: updatedUser,
      });
    } catch (err) {
      console.error("Failed to reset numberOfTotalPlay", err);
      return res.status(500).json({
        success: false,
        error: "Failed to reset numberOfTotalPlay",
      });
    }
  },
);

// Admin: list transfer history (send-money feature)
router.get("/transfers", adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);

    const transfers = await prisma.transferHistory.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            telegramId: true,
            name: true,
            username: true,
            userNumber: true,
          },
        },
        receiver: {
          select: {
            id: true,
            telegramId: true,
            name: true,
            username: true,
            userNumber: true,
          },
        },
      },
    });

    return res.json({ success: true, transfers });
  } catch (err) {
    console.error("Failed to load transfer history", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to load transfer history" });
  }
});
router.patch("/update_bonus", adminAuthMiddleware, async (req, res) => {
  const { defaultAmount } = req.body;
  if (typeof defaultAmount !== "number" || defaultAmount < 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid bonus amount" });
  }
  try {
    const bonusRecord = await prisma.bonus.findFirst();
    let updatedBonus;
    if (bonusRecord) {
      updatedBonus = await prisma.bonus.update({
        where: { id: bonusRecord.id },
        data: { defaultAmount },
      });
    } else {
      updatedBonus = await prisma.bonus.create({
        data: { defaultAmount },
      });
    }
    res.json({ success: true, bonus: updatedBonus });
  } catch (err) {
    console.error("Failed to update bonus", err);
    res.status(500).json({ success: false, error: "Failed to update bonus" });
  }
});

// Admin: update user current balance
router.patch("/users/:id/balance", adminAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { currentBalance } = req.body || {};

  if (!Number.isFinite(currentBalance) || currentBalance < 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid balance value" });
  }

  try {
    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Ensure balance record exists
    let balance = await prisma.userBalance.findUnique({
      where: { userId: id },
    });
    if (!balance) {
      balance = await prisma.userBalance.create({
        data: { userId: id },
      });
    }

    const updatedBalance = await prisma.userBalance.update({
      where: { userId: id },
      data: { currentBalance },
    });

    res.json({ success: true, balance: updatedBalance });
  } catch (err) {
    console.error("Failed to update user balance", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update user balance" });
  }
});

router.patch(
  "/users/:id/reward-balance",
  adminAuthMiddleware,
  async (req, res) => {
    const id = Number(req.params.id);
    const { rewardBalance } = req.body || {};

    if (!Number.isFinite(rewardBalance) || rewardBalance < 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid reward balance value" });
    }

    try {
      // Ensure user exists
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Update rewardBalance directly on user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { rewardBalance },
      });

      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Failed to update user reward balance", err);
      res.status(500).json({
        success: false,
        error: "Failed to update user reward balance",
      });
    }
  },
);

// Admin: ban or unban a user
router.patch("/users/:id/ban", adminAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { banned } = req.body;

  if (typeof banned !== "boolean") {
    return res
      .status(400)
      .json({ success: false, error: "Invalid banned value" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { banned },
    });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Failed to ban/unban user", err);
    res.status(500).json({ success: false, error: "Failed to ban/unban user" });
  }
});

// Admin: delete a user permanently
router.delete("/users/:id", adminAuthMiddleware, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Delete user and all related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete user balance
      await tx.userBalance.deleteMany({ where: { userId: id } });

      // Delete user from game sessions and related data
      await tx.bingoSessionPlayer.deleteMany({ where: { userId: id } });

      // Delete any other user-related records here
      // Add more deletions as needed for other tables

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    res.json({ success: true, message: "User deleted permanently" });
  } catch (err) {
    console.error("Failed to delete user", err);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

router.get("/requests", adminAuthMiddleware, async (_req, res) => {
  try {
    const { deposits, withdrawals } = await getPendingRequests();
    res.json({ success: true, deposits, withdrawals });
  } catch (err) {
    console.error("Failed to load requests", err);
    res.status(500).json({ success: false, error: "Failed to load requests" });
  }
});

router.get("/requests/all", adminAuthMiddleware, async (_req, res) => {
  try {
    const { deposits, withdrawals } = await getAllRequests();
    res.json({ success: true, deposits, withdrawals });
  } catch (err) {
    console.error("Failed to load all requests", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to load all requests" });
  }
});
router.get("/admin_games", adminAuthMiddleware, async (_req, res) => {
  try {
    const games = await prisma.game.findMany();
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
});
router.post("/deposits/:id/approve", adminAuthMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await approveDeposit(id);
    res.json({ success: true, request: updated });
  } catch (err) {
    console.error("Failed to approve deposit", err);
    res.status(400).json({
      success: false,
      error: err.message || "Failed to approve deposit",
    });
  }
});

router.post("/deposits/:id/reject", adminAuthMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await rejectDeposit(id);
    res.json({ success: true, request: updated });
  } catch (err) {
    console.error("Failed to reject deposit", err);
    res.status(400).json({
      success: false,
      error: err.message || "Failed to reject deposit",
    });
  }
});

router.post(
  "/withdrawals/:id/approve",
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await approveWithdrawal(id);
      res.json({ success: true, request: updated });
    } catch (err) {
      console.error("Failed to approve withdrawal", err);
      res.status(400).json({
        success: false,
        error: err.message || "Failed to approve withdrawal",
      });
    }
  },
);

router.post(
  "/withdrawals/:id/reject",
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await rejectWithdrawal(id);
      res.json({ success: true, request: updated });
    } catch (err) {
      console.error("Failed to reject withdrawal", err);
      res.status(400).json({
        success: false,
        error: err.message || "Failed to reject withdrawal",
      });
    }
  },
);

// GET /bonus - fetch the default bonus value
router.get("/bonus", async (_req, res) => {
  try {
    console.log("Fetching bonus value");
    const bonus = await prisma.bonus.findFirst({
      select: {
        defaultAmount: true,
      },
    });
    if (!bonus) {
      return res.status(404).json({ success: false, error: "Bonus not found" });
    }
    res.json({ success: true, amount: bonus.defaultAmount });
  } catch (err) {
    console.error("Failed to fetch bonus", err);
    res.status(500).json({ success: false, error: "Failed to fetch bonus" });
  }
});
router.get("/usersGamesBeforeWin", adminAuthMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        telegramId: true,
        username: true,
        gamesBeforeFirstWin: true,
      },
      orderBy: { gamesBeforeFirstWin: "desc" },
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users gamesBeforeFirstWin:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/bots/config", adminAuthMiddleware, async (_req, res) => {
  try {
    const config = demoBotConfig.getConfig();
    res.json({ success: true, config });
  } catch (err) {
    console.error("Failed to load bot config", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to load bot config" });
  }
});
router.patch("/bots/config", adminAuthMiddleware, async (req, res) => {
  try {
    const allowed = [
      "minCards",
      "maxCards",
      "minCardId",
      "maxCardId",
      "simulatedPlayers",
      "botDefaultStake",
      "enabled",
      // allow updating demo winner names from admin
      "demoWinnerNames",
    ];
    const partial = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k))
        partial[k] = req.body[k];
    }
    const updated = demoBotConfig.updateConfig(partial);
    res.json({ success: true, config: updated });
  } catch (err) {
    console.error("Failed to update bot config", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update bot config" });
  }
});

export default router;
