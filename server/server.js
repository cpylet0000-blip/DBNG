import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import TelegramBot from "node-telegram-bot-api";
import { parse as parseInitData } from "@telegram-apps/init-data-node";
import prisma from "./lib/prisma.js";
import * as bingoRoomService from "./service/bingoRoomService.js";
import demoBotConfig from "./lib/demoBotConfig.js";
import { setRuntimeBot } from "./lib/bot/runtimeBot.js";

import { registerBotHandlers } from "./lib/bot/registerBotHandlers.js";
import { setupWebSocket } from "./lib/websocket/setupWebSocket.js";
import {
  stopPeriodicCountdownCheck,
  cleanupAllTimers,
} from "./lib/websocket/handlers/bingoHandlers.js";
import { checkAndDrawExpiredLotteries } from "./service/autoDrawService.js";
import bingoRoutes from "./routes/bingo.js";
import adminRoutes from "./routes/admin.js";
import adminLotteryDrawRoutes from "./routes/adminLotteryDraw.js";
import adminStepByStepDrawRoutes from "./routes/adminStepByStepDraw.js";
import lotteryRoutes from "./routes/lottery.js";
import leaderBoardRoutes from "./api/leaderboard.js";
import kenoRoutes from "./routes/keno.js";
import authRoutes from "./routes/auth.js";
import spinWinRoutes from './routes/spinWin.js';
import spinWinAnalyticsRoutes from './routes/spinWinAnalytics.js';

import gamesRoutes from "./routes/games.js";
import avatarRoutes from "./routes/avatar.js";
import userRoutes from "./api/user.js";
import stakeBonusesRoutes from "./api/stake-bonuses.js";
import depositRoutes from "./routes/deposit.js";
import withdrawRoutes from "./routes/withdraw.js";
import depositMethodRoutes from "./routes/depositMethod.js";
import adminUserAnalyticsRoutes from "./routes/adminUserAnalytics.js";
import adminFinancialAnalyticsRoutes from "./routes/adminFinancialAnalytics.js";
import adminStakeBonusesRoutes from "./routes/adminStakeBonuses.js";
import adminSpinWinRoutes from "./routes/adminSpinWin.js";
import flagsFeatureRoutes from "./routes/flagsFeature.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import bingoArchiveRoutes from "./routes/bingoArchive.js";
import profileRoutes from "./routes/profile.js";
// Deposit method and withdraw lock routes
dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const PORT = Number(process.env.PORT) || 5000;
if (!BOT_TOKEN) {
  console.warn("BOT_TOKEN is missing in .env â€” Telegram bot will not start.");
}
const app = express();
app.use(express.json());
// Development-friendly CORS so Vite/front-end can call the API from another origin
app.use((req, res, next) => {
  const allowed = process.env.CORS_ORIGIN;
  const origin = req.headers.origin;
  if (origin && allowed.split(",").includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS,PATCH",
  );
  res.header(
    "Access-Control-Allow-Headers",
    [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-telegram-init-data",
      "x-dev-telegram-id",
      "x-dev-telegram-name",
      "x-dev-telegram-username",
      "x-dev-first_name",
      "x-dev-last_name",
      "x-dev-username",
    ].join(", "),
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
const validateInitData = (initDataRaw = "") => {
  if (!BOT_TOKEN) return null;
  if (!initDataRaw) return null;
  try {
    const parsed = parseInitData(initDataRaw, BOT_TOKEN);
    return parsed;
  } catch (err) {
    return null;
  }
};
app.use("/api", (req, _res, next) => {
  const devId = req.header("x-dev-telegram-id") || "";
  if (devId) {
    const devFirst =
      req.header("x-dev-first_name") || req.header("x-dev-first") || null;
    const devLast =
      req.header("x-dev-last_name") || req.header("x-dev-last") || null;
    const devName = req.header("x-dev-telegram-name") || null;
    const devUsername =
      req.header("x-dev-telegram-username") ||
      req.header("x-dev-username") ||
      null;

    const first_name = devFirst || devName;
    const last_name = devLast || null;

    req.tgUser = {
      id: devId,
      username: devUsername,
      first_name,
      last_name,
    };
    return next();
  }

  const initData = req.header("x-telegram-init-data") || "";
  if (initData) {
    console.log(
      "[server] Received x-telegram-init-data (length):",
      initData.length,
    );
  } else {
    console.log("[server] No x-telegram-init-data header present");
  }

  const validated = validateInitData(initData);
  if (initData && !validated) {
    console.warn("[server] initData present but failed validation");
  }

  if (validated?.user) {
    // parsed .user from library is already an object
    req.tgUser = validated.user;
  } else if (validated && validated.id) {
    // Some versions put fields at top-level
    req.tgUser = validated;
  } else {
    req.tgUser = null;
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api/avatar", avatarRoutes);

// Support page with two styled buttons (GET /support)
app.get("/support", (req, res) => {
  const supportUrl = process.env.VITE_TG_SUPPORT_BOT_URL;
  const groupUrl = process.env.VITE_TG_GROUP_URL;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html>
    <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Support</title>
        <style>
            :root{--bg:#0f1724;--card:#0b1220;--muted:#9ca3af}
            body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#071129 0%, #071723 100%);font-family:Inter,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial}
            .card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));padding:28px;border-radius:14px;box-shadow:0 10px 30px rgba(2,6,23,0.7);max-width:720px;width:92%;text-align:center;color:#fff}
            h1{margin:0 0 8px;font-size:20px}
            p{color:var(--muted);margin:0 0 18px;font-size:14px}
            .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
            .btn{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;color:#fff;text-decoration:none;font-weight:600;box-shadow:0 6px 18px rgba(2,6,23,0.6);transition:transform .12s ease,box-shadow .12s ease}
            .btn svg{width:18px;height:18px;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35))}
            .btn-support{background:linear-gradient(90deg,#6366f1,#8b5cf6)}
            .btn-support:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(99,102,241,0.18)}
            .btn-group{background:linear-gradient(90deg,#10b981,#06b6d4)}
            .btn-group:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(6,182,212,0.14)}
            @media (max-width:420px){.actions{flex-direction:column}.btn{width:100%}}
        </style>
    </head>
    <body>
        <div class="card" role="main" aria-labelledby="supportTitle">
            <h1 id="supportTitle">Need help or want to join our community?</h1>
            <p>Use the buttons below to message support or join the Telegram group.</p>
            <div class="actions">
                <a class="btn btn-support" href="${supportUrl}" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" fill="rgba(255,255,255,0.12)"/><path d="M7 8h10M7 12h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Get support
                </a>
                <a class="btn btn-group" href="${groupUrl}" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 11c1.657 0 3-1.343 3-3S17.657 5 16 5s-3 1.343-3 3 1.343 3 3 3zM6 11c1.657 0 3-1.343 3-3S7.657 5 6 5 3 6.343 3 8s1.343 3 3 3zM6 13c-2.667 0-8 1.333-8 4v2h14v-2c0-2.667-5.333-4-8-4zm10 0c-.29 0-.58.01-.86.03 1.05.98 1.86 2.17 1.86 3.47v2h6v-2c0-2.667-5.333-4-8-4z" fill="rgba(255,255,255,0.12)"/><path d="M6 13c2.667 0 8 1.333 8 4v2H-2v-2c0-2.667 5.333-4 8-4z" fill="none"/></svg>
                    Join group
                </a>
            </div>
        </div>
    </body>
</html>`);
});
app.get("/api/profile", async (req, res) => {
  if (!req.tgUser)
    return res
      .status(401)
      .json({ error: "Invalid or missing Telegram init data" });

  const { id, username, first_name, last_name } = req.tgUser;
  const telegramId = String(id);
  const name = [first_name, last_name].filter(Boolean).join(" ") || null;

  try {
    const user = await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: username || null,
        name,
      },
      update: {
        // Only update username and name if provided, don't overwrite with null
        ...(username && { username }),
        ...(name && { name }),
      },
      include: {
        balance: true,
      },
    });

    // Ensure a UserBalance record exists with a default currentBalance of 15
    if (!user.balance) {
      await prisma.userBalance.create({
        data: {
          userId: user.id,
          currentBalance: 15,
        },
      });
    }
    // Fetch the user again to include the newly created balance

    const withBalance = await prisma.user.findUnique({
      where: { id: user.id },
      include: { balance: true },
    });

    // Normalize response: include balance fields at top-level for convenience
    const responseUser = {
      id: withBalance.id,
      telegramId: withBalance.telegramId,
      username: withBalance.username,
      name: withBalance.name,
      userNumber: withBalance.userNumber,
      createdAt: withBalance.createdAt,
      balance: withBalance.balance || null,
      rewardBalance: withBalance.rewardBalance ?? 0,
      totalInvitation: withBalance.totalInvitation ?? 0,
      activeInvitation: withBalance.activeInvitation ?? 0,
      rewardPlay: withBalance.rewardPlay ?? 0,
      numberOfTotalPlay: withBalance.numberOfTotalPlay,
      rewardChallenge: withBalance.rewardChallenge ?? 0,
    };

    return res.json({ user: responseUser });
  } catch (err) {
    console.error("Failed to fetch profile", err);
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

app.post("/api/profile/phone", async (req, res) => {
  if (!req.tgUser)
    return res
      .status(401)
      .json({ error: "Invalid or missing Telegram init data" });

  const { id, username, first_name, last_name } = req.tgUser;
  const telegramId = String(id);
  const name = [first_name, last_name].filter(Boolean).join(" ") || null;
  const phoneRaw = req.body?.userNumber;
  const phone = (typeof phoneRaw === "string" ? phoneRaw : "").trim();

  if (!phone) return res.status(400).json({ error: "userNumber is required" });
  if (phone.length > 64)
    return res.status(400).json({ error: "userNumber is too long" });

  try {
    const user = await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: username || null,
        name,
        userNumber: phone,
      },
      update: {
        username: username || null,
        name,
        userNumber: phone,
      },
      include: {
        balance: true,
      },
    });

    if (!user.balance) {
      await prisma.userBalance.create({
        data: {
          userId: user.id,
          currentBalance: 10,
        },
      });
    }

    const withBalance = await prisma.user.findUnique({
      where: { id: user.id },
      include: { balance: true },
    });

    const responseUser = {
      id: withBalance.id,
      telegramId: withBalance.telegramId,
      username: withBalance.username,
      name: withBalance.name,
      userNumber: withBalance.userNumber,
      createdAt: withBalance.createdAt,
      balance: withBalance.balance || null,
    };

    return res.json({ user: responseUser });
  } catch (err) {
    console.error("Failed to update phone", err);
    return res.status(500).json({ error: "Failed to update phone" });
  }
});

// Mount bingo routes
app.use("/api/bingo", bingoRoutes);
// Mount bingo archive routes
app.use("/api/bingo-archive", bingoArchiveRoutes);
// Mount lottery routes
app.use("/api/lottery", lotteryRoutes);
// Mount keno routes
app.use("/api/keno", kenoRoutes);
// Admin SpinWin analytics routes
app.use("/api/admin/spin-win", adminSpinWinRoutes);
// Admin routes (owner earnings summary)
app.use("/api/admin", adminRoutes);
app.use("/api/admin/lottery-draw", adminLotteryDrawRoutes);
app.use("/api/admin/step-by-step-draw", adminStepByStepDrawRoutes);
// Auth routes
app.use("/api", authRoutes);
// Profile routes
app.use("/api/profile", profileRoutes);
// Games routes
app.use("/api", gamesRoutes);
// User routes
app.use("/api/user", userRoutes);
// Stake bonuses routes
app.use('/api/spin-win', spinWinRoutes);
// Mount SpinWin analytics routes
app.use('/api/analytics/spin-win', spinWinAnalyticsRoutes);
app.use("/api/stake-bonuses", stakeBonusesRoutes);
// Deposit routes
app.use("/api/depositer", depositRoutes);
app.use("/api/leaderboard", leaderBoardRoutes);
// Withdraw routes
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/deposit-methods", depositMethodRoutes);
// Admin User Analytics routes
app.use("/api/admin/analytics", adminUserAnalyticsRoutes);
// Admin Financial Analytics routes
app.use("/api/admin/financial", adminFinancialAnalyticsRoutes);
// Admin Stake Bonuses routes
app.use("/api/admin/stake-bonuses", adminStakeBonusesRoutes);

// Mount admin flags/feature flags routes
app.use("/api", flagsFeatureRoutes);

// Password reset routes
app.use("/api/password-reset", passwordResetRoutes);

let bot = null;
if (BOT_TOKEN) {
  bot = new TelegramBot(BOT_TOKEN, { polling: false });
}
setRuntimeBot(bot);

// ... (rest of the code remains the same)
if (bot) {
  // Telegram will post updates to this endpoint.
  app.post("/telegram/webhook", (req, res) => {
    try {
      const updateId = req.body?.update_id;
      const types = Object.keys(req.body || {}).filter(
        (k) => k !== "update_id",
      );
      bot.processUpdate(req.body);
    } catch (err) {
      console.error("[webhook] failed to process update", err);
    }
    res.sendStatus(200);
  });

  // Register all bot handlers (start, buttons, contact, web_app_data)
  registerBotHandlers(bot);
}

const start = async () => {
  if (bot && WEBHOOK_URL) {
    // Allow WEBHOOK_URL to be either the full endpoint or just the base URL
    const hasPath = WEBHOOK_URL.includes("/telegram/webhook");
    const webhook = hasPath
      ? WEBHOOK_URL
      : `${WEBHOOK_URL.replace(/\/$/, "")}/telegram/webhook`;
    try {
      await bot.setWebHook(webhook);
      console.log("Webhook set to", webhook);
    } catch (err) {
      console.error("Failed to set webhook:", err?.message || err);
    }
  } else if (bot && !WEBHOOK_URL) {
    console.warn(
      "WEBHOOK_URL not set â€” set it to your ngrok https URL to receive updates.",
    );
  }

  // Create HTTP server and setup WebSocket
  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  // Start auto-draw scheduler (runs every 30 seconds)
  // Disabled by default to save CPU. Enable with env var ENABLE_AUTO_DRAW=true
  if (process.env.ENABLE_AUTO_DRAW === "true") {
    setInterval(async () => {
      try {
        await checkAndDrawExpiredLotteries();
      } catch (error) {
        console.error("[Server] Auto-draw scheduler error:", error);
      }
    }, 30000); // 30 seconds
  }

  httpServer.listen(PORT, () => {
    console.log("Server running on port", PORT);
    console.log("WebSocket server ready");
    console.log("Auto-draw scheduler started (30 second intervals)");
  });

  const botAccountsRaw = process.env.BOT_ACCOUNTS || "";
  if (botAccountsRaw) {
    const BOT_DEFAULT_STAKE = Number(process.env.BOT_DEFAULT_STAKE || 10);
    const BOT_MIN_CARDS = Number(process.env.BOT_MIN_CARDS || 1);
    const BOT_MAX_CARDS = Number(process.env.BOT_MAX_CARDS || 3);
    const BOT_TOPUP_AMOUNT = Number(process.env.BOT_TOPUP_AMOUNT || 5000);
    const BOT_POLL_INTERVAL_MS = Number(
      process.env.BOT_POLL_INTERVAL_MS || 5000,
    );
    const BOT_REJOIN_DELAY_MS = Number(process.env.BOT_REJOIN_DELAY_MS || 7000);
    const BOT_REJOIN_MIN_MS = Number(
      process.env.BOT_REJOIN_MIN_MS || BOT_REJOIN_DELAY_MS,
    );
    const BOT_REJOIN_MAX_MS = Number(
      process.env.BOT_REJOIN_MAX_MS || BOT_REJOIN_DELAY_MS,
    );
    const BOT_SELECT_MIN_MS = Number(process.env.BOT_SELECT_MIN_MS || 1000);
    const BOT_SELECT_MAX_MS = Number(process.env.BOT_SELECT_MAX_MS || 2000);
    const BOT_SELECT_GROWTH_FACTOR = Number(
      process.env.BOT_SELECT_GROWTH_FACTOR || 0.25,
    );
    const BOT_SELECT_MAX_MULTIPLIER = Number(
      process.env.BOT_SELECT_MAX_MULTIPLIER || 3,
    );
    const BOT_SELECT_JITTER_MS = Number(
      process.env.BOT_SELECT_JITTER_MS || 200,
    );

    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    async function findOrCreateUserByTelegramId(tid) {
      if (!tid) return null;
      let user = await prisma.user.findUnique({
        where: { telegramId: String(tid) },
      });
      if (user) return user;
      if (process.env.AUTO_CREATE_BOT_USERS === "true") {
        const name = `DemoBot ${tid}`;
        user = await prisma.user.create({
          data: { telegramId: String(tid), name },
        });
        await prisma.userBalance.create({
          data: { userId: user.id, currentBalance: BOT_TOPUP_AMOUNT },
        });
        return user;
      }
      return null;
    }

    function pickRandom(array, n) {
      const copy = array.slice();
      const res = [];
      while (res.length < n && copy.length) {
        const idx = Math.floor(Math.random() * copy.length);
        res.push(copy.splice(idx, 1)[0]);
      }
      return res;
    }

    async function pickAvailableCardIds(
      stake,
      count,
      minCardId = 1,
      maxCardId = 100,
    ) {
      const available = await bingoRoomService.getAvailableCards(stake);
      const free = available
        .filter((c) => c.isAvailable)
        .map((c) => c.cardId)
        .filter((id) => id >= Number(minCardId) && id <= Number(maxCardId));
      if (free.length === 0) return [];
      const pickCount = Math.min(count, free.length);
      return pickRandom(free, pickCount);
    }

    async function ensureBalance(userId, needed) {
      if (!userId) return false;
      let ub = await prisma.userBalance.findUnique({ where: { userId } });
      if (!ub) {
        ub = await prisma.userBalance.create({
          data: { userId, currentBalance: 0 },
        });
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rewardBalance: true },
      });
      const reward = user?.rewardBalance || 0;
      const total = (ub.currentBalance || 0) + reward;
      if (total >= needed) return true;
      if (BOT_TOPUP_AMOUNT > 0) {
        await prisma.userBalance.update({
          where: { userId },
          data: { currentBalance: { increment: BOT_TOPUP_AMOUNT } },
        });
        return true;
      }
      return false;
    }

    async function runBotLoop(tid, control) {
      const user = await findOrCreateUserByTelegramId(tid);
      if (!user) {
        console.warn(
          `[auto-bots] user ${tid} not found and AUTO_CREATE_BOT_USERS not enabled`,
        );
        return;
      }
      const dbId = user.id;
      console.log(
        `[auto-bots] starting demo bot for telegramId=${tid} dbId=${dbId}`,
      );

      while (!control?.stopRequested) {
        try {
          // Read runtime config each loop so changes apply on next game
          let cfg = {};
          try {
            cfg = demoBotConfig.getConfig() || {};
          } catch (err) {
            cfg = {};
          }

          // If demo bot is disabled via admin, skip selecting until enabled again
          if (cfg.enabled === false) {
            // do not interrupt an ongoing session; this check occurs before selecting
            await sleep(BOT_POLL_INTERVAL_MS);
            continue;
          }

          // Determine card count using runtime config for demo bots when available
          let minC = BOT_MIN_CARDS;
          let maxC = BOT_MAX_CARDS;
          if (cfg.minCards !== undefined && cfg.minCards !== null)
            minC = Number(cfg.minCards || minC);
          if (cfg.maxCards !== undefined && cfg.maxCards !== null)
            maxC = Number(cfg.maxCards || maxC);
          if (maxC < minC) maxC = minC;
          const stakePerCard = Number(cfg.botDefaultStake || BOT_DEFAULT_STAKE);
          // random between minC and maxC inclusive
          const numCards = Math.floor(Math.random() * (maxC - minC + 1)) + minC;
          const totalStake = stakePerCard * numCards;
          await ensureBalance(dbId, totalStake);
          // use configured card id gap/range when picking available cards
          let minCardId = 1;
          let maxCardId = 100;
          if (cfg.minCardId !== undefined && cfg.minCardId !== null)
            minCardId = Number(cfg.minCardId || minCardId);
          if (cfg.maxCardId !== undefined && cfg.maxCardId !== null)
            maxCardId = Number(cfg.maxCardId || maxCardId);
          if (maxCardId < minCardId) maxCardId = minCardId;

          // Pick and select cards. For multi-card picks, choose subsequent
          // cards freshly at selection time so the second (and others) are random
          // with current availability.
          const availableAll =
            await bingoRoomService.getAvailableCards(stakePerCard);
          let free = availableAll
            .filter((c) => c.isAvailable)
            .map((c) => c.cardId)
            .filter((id) => id >= Number(minCardId) && id <= Number(maxCardId));
          if (!free || free.length === 0) {
            await sleep(BOT_POLL_INTERVAL_MS);
            continue;
          }

          const pickCount = Math.min(numCards, free.length);

          try {
            if (pickCount <= 1) {
              const toSelect = [free[Math.floor(Math.random() * free.length)]];
              await bingoRoomService.selectMultipleCards(
                stakePerCard,
                dbId,
                toSelect,
              );
              console.log(`[auto-bots] ${tid} selected ${toSelect[0]}`);
            } else {
              const picked = [];
              for (let i = 0; i < pickCount; i++) {
                // refresh availability each iteration to pick a fresh random available card
                const avail = (
                  await bingoRoomService.getAvailableCards(stakePerCard)
                )
                  .filter((c) => c.isAvailable)
                  .map((c) => c.cardId)
                  .filter(
                    (id) => id >= Number(minCardId) && id <= Number(maxCardId),
                  )
                  .filter((id) => !picked.includes(id));
                if (!avail || avail.length === 0) break;
                const sel = avail[Math.floor(Math.random() * avail.length)];
                try {
                  await bingoRoomService.selectMultipleCards(
                    stakePerCard,
                    dbId,
                    [sel],
                  );
                  picked.push(sel);
                  console.log(`[auto-bots] ${tid} selected card: ${sel}`);
                } catch (err) {
                  console.error(
                    "[auto-bots] selectSingleCard error",
                    err?.message || err,
                  );
                }
                if (i < pickCount - 1) {
                  const selMin = Math.min(BOT_SELECT_MIN_MS, BOT_SELECT_MAX_MS);
                  const selMax = Math.max(BOT_SELECT_MIN_MS, BOT_SELECT_MAX_MS);
                  const baseDelay =
                    Math.floor(Math.random() * (selMax - selMin + 1)) + selMin;
                  const rawMultiplier =
                    1 + (numCards - 1) * BOT_SELECT_GROWTH_FACTOR;
                  const multiplier = Math.min(
                    BOT_SELECT_MAX_MULTIPLIER,
                    Math.max(1, rawMultiplier),
                  );
                  const selDelay = Math.floor(baseDelay * multiplier);
                  // add small random jitter (±BOT_SELECT_JITTER_MS)
                  const jitter = Math.max(0, Math.floor(BOT_SELECT_JITTER_MS));
                  const jitterVal =
                    Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
                  const finalDelay = Math.max(0, selDelay + jitterVal);
                  await sleep(finalDelay);
                }
              }
            }
          } catch (err) {
            console.error(
              "[auto-bots] selectMultipleCards error",
              err?.message || err,
            );
          }

          // wait for session to finish
          let sessionDone = false;
          while (!sessionDone) {
            const sd = await bingoRoomService.getSessionDetails(
              stakePerCard,
              1,
            );
            if (!sd || sd.status === "finished") {
              sessionDone = true;
              break;
            }
            await sleep(BOT_POLL_INTERVAL_MS);
          }

          // use randomized rejoin delay between configured min/max
          const rejoinMin = Math.min(BOT_REJOIN_MIN_MS, BOT_REJOIN_MAX_MS);
          const rejoinMax = Math.max(BOT_REJOIN_MIN_MS, BOT_REJOIN_MAX_MS);
          const rejoinDelay =
            Math.floor(Math.random() * (rejoinMax - rejoinMin + 1)) + rejoinMin;
          await sleep(rejoinDelay);
        } catch (err) {
          console.error("[auto-bots] loop error", err?.message || err);
          await sleep(5000);
        }
      }
    }

    const ids = botAccountsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const botLoopControllers = new Map();

    function startBotLoop(tid, delayMs = 0) {
      const existing = botLoopControllers.get(tid);
      if (existing) {
        existing.stopRequested = false;
        return;
      }
      const controller = { stopRequested: false };
      botLoopControllers.set(tid, controller);
      setTimeout(() => {
        runBotLoop(tid, controller)
          .catch((e) => console.error("[auto-bots] uncaught", e))
          .finally(() => {
            if (botLoopControllers.get(tid) === controller) {
              botLoopControllers.delete(tid);
            }
          });
      }, delayMs);
    }

    function syncBotLoops() {
      const cfg = demoBotConfig.getConfig() || {};
      const desiredCount = Math.min(
        10,
        Math.max(1, Number(cfg.simulatedPlayers || 1)),
      );
      const desiredIds = ids.slice(0, Math.min(desiredCount, ids.length));
      const desiredSet = new Set(desiredIds);

      desiredIds.forEach((tid, i) => startBotLoop(tid, i * 250));

      for (const [tid, controller] of botLoopControllers.entries()) {
        if (!desiredSet.has(tid)) {
          controller.stopRequested = true;
        }
      }
    }

    syncBotLoops();
    setInterval(syncBotLoops, 2000);
  }
};

start();
// Graceful shutdown handlers
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM received, cleaning up...");
  stopPeriodicCountdownCheck();
  cleanupAllTimers();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Server] SIGINT received, cleaning up...");
  stopPeriodicCountdownCheck();
  cleanupAllTimers();
  process.exit(0);
});
