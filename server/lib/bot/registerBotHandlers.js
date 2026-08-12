import prisma from "../prisma.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { updateLeaderboardStat } from '../../service/leaderboardService.js';
import { claimRewardCombo } from '../../service/rewardService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const registerBotHandlers = (bot) => {
  // Helper function to check if user is admin
  const isAdmin = (userId) => {
    const adminIds =
      process.env.ADMIN_TELEGRAM_IDS?.split(",").map((id) => id.trim()) || [];
    return adminIds.includes(String(userId));
  };
  const upsertUser = async ({
    telegramId,
    username,
    name,
    userNumber = null,
  }) => {
    if (!telegramId) return null;
    // Build create/update payloads without overwriting existing fields with undefined/null
    const createData = { telegramId };
    if (typeof username !== "undefined") createData.username = username || null;
    if (typeof name !== "undefined") createData.name = name || null;
    if (typeof userNumber !== "undefined" && userNumber !== null)
      createData.userNumber = userNumber;

    const updateData = {};
    if (typeof username !== "undefined") updateData.username = username || null;
    if (typeof name !== "undefined") updateData.name = name || null;
    if (typeof userNumber !== "undefined" && userNumber !== null)
      updateData.userNumber = userNumber;

    return prisma.user.upsert({
      where: { telegramId },
      create: createData,
      update: updateData,
    });
  };

  // Support / group URLs (use VITE_TG_SUPPORT_BOT_URL and TG_GROUP_URL if present)
  const supportUrl =
    process.env.VITE_TG_SUPPORT_BOT_URL ||
    process.env.VITE_TG_BOT_URL ||
    "https://t.me/";
  const groupUrl =
    process.env.VITE_TG_GROUP_URL ||
    process.env.TG_GROUP_URL ||
    "https://t.me/";

  // Helper function to check if user is registered (has phone number)
  const isUserRegistered = async (telegramId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { userNumber: true },
      });
      return Boolean(user?.userNumber);
    } catch (error) {
      console.error("Error checking user registration:", error);
      return false;
    }
  };

  // Helper function to get appropriate inline keyboard based on registration status
  const getWelcomeKeyboard = async (telegramId, appUrl) => {
    const isRegistered = await isUserRegistered(telegramId);

    const keyboard = [];

    // Only show Register button if user is not registered
    if (!isRegistered) {
      keyboard.push([
        { text: "🎯 START PLAYING 🚀", callback_data: "request_contact" },
      ]);
    } else {
      // Only show Play Now if user is registered
      keyboard.push([{ text: "🎮 PLAY NOW 🚀", web_app: { url: appUrl } }]);
    }

    keyboard.push([
      { text: "🎧 Support", url: supportUrl },
      { text: "📢 Join Group", url: groupUrl },
    ]);

    keyboard.push([
      { text: "🎁 Invite Friends", callback_data: "invite_friend" },
    ]);

    return { inline_keyboard: keyboard };
  };

  // /start menu
  bot.onText(/\/start(.*)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const firstName = msg.from?.first_name;
    const appUrl = process.env.WEB_APP_URL;
    const telegramId = msg.from?.id ? String(msg.from.id) : null;
    const nameFromTelegram =
      [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
      null;
    const startParam = match[1]?.trim();

    // Handle referral tracking
    let referrerId = null;
    if (startParam && startParam.startsWith("ref_")) {
      referrerId = startParam.replace("ref_", "");

      try {
        // Check if user is already registered
        const existingUser = await prisma.user.findUnique({
          where: { telegramId },
        });

        if (existingUser) {
          // User already registered, don't process referral
          console.log(
            `[Bot] User ${telegramId} already registered, skipping referral`,
          );
          await upsertUser({
            telegramId,
            username: msg.from?.username,
            name: nameFromTelegram,
          });
          // Continue so /start still sends the normal welcome menu/buttons.
        }

        if (!existingUser) {
          // Check if referrer exists and is not the same user
          const referrer = await prisma.user.findUnique({
            where: { telegramId: referrerId },
          });

          if (referrer && referrerId !== telegramId) {
            // Update referrer's invitation stats
            await prisma.user.update({
              where: { telegramId: referrerId },
              data: {
                totalInvitation: { increment: 1 },
                activeInvitation: { increment: 1 },
              },
            });
            // Update leaderboard stat for invitation
            await updateLeaderboardStat(referrer.id, 'INVITATION');

            console.log(
              `[Bot] User ${telegramId} was referred by ${referrerId}`,
            );

            // Notify referrer about successful invitation
            // try {
            //   await bot.sendMessage(
            //     referrerId,
            //     `🎉 Congratulations! Someone joined through your invite link!\n\nTotal invitations: ${(referrer.totalInvitation || 0) + 1}`,
            //   );
            // } catch (notifyError) {
            //   console.log(
            //     "Could not notify referrer (user may have blocked the bot):",
            //     notifyError.message,
            //   );
            // }
          } else {
            console.log(
              `[Bot] Invalid referrer ${referrerId} or same user, skipping referral`,
            );
          }
        }
      } catch (error) {
        console.error("Error processing referral:", error);
      }
    }

    // Register user with name immediately on /start
    try {
      await upsertUser({
        telegramId,
        username: msg.from?.username,
        name: nameFromTelegram,
      });
      console.log(
        `[Bot] Registered user ${telegramId} with name: ${nameFromTelegram}`,
      );
    } catch (err) {
      console.error("Failed to upsert user on /start", err);
    }

    // Send welcome image with caption
    const imagePath = path.join(__dirname, "../../public/welcome.png");
    const welcomeCaption = `<b>✨ እንኳን ወደ ግዮን በደህና መጡ${firstName ? `, ${firstName}` : ""}! ✨</b>

🎲 <b>ቢንጎ ይጫዎቱ፣ ስፒን ያድርጉ፣ ዕድልዎን ይሞክሩ!</b>
💰 <b>ታላላቅ የገንዘብ ሽልማቶች ይጠብቁዎታል!</b>

🎯 <b>ዕድልዎን ይሞክሩ ዛሬውኑ ያሸንፉ!</b>
🍀 <b>መልካም ዕድል! 🚀</b>`;
    try {
      // Get appropriate keyboard based on registration status
      const keyboard = await getWelcomeKeyboard(telegramId, appUrl);

      // Check if image file exists
      if (fs.existsSync(imagePath)) {
        await bot.sendPhoto(chatId, fs.createReadStream(imagePath), {
          caption: welcomeCaption,
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      } else {
        console.warn(
          `[Bot] Image not found at ${imagePath}, using text message instead`,
        );
        throw new Error("Image file not found");
      }
    } catch (err) {
      // Fallback to text message if image fails
      const keyboard = await getWelcomeKeyboard(telegramId, appUrl);
      bot.sendMessage(chatId, welcomeCaption, {
        reply_markup: keyboard,
        parse_mode: "HTML",
      });
    }
  });
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat?.id;
    const messageId = query.message?.message_id;
    const userId = query.from?.id;
    const nameFromTelegram =
      [query.from?.first_name, query.from?.last_name]
        .filter(Boolean)
        .join(" ") || null;
    const appUrl = process.env.WEB_APP_URL;

    if (!chatId || !messageId) return;

    if (query.data === "request_contact") {
      bot.answerCallbackQuery(query.id, {
        text: "🎯 Get ready to win! Share your contact to start playing!",
      });
      bot.sendMessage(
        chatId,
        "✨ **የመጨረሻው ደረጃ!** ✨\n\n📱 *እባክዎ ከታች ያለውን ቁልፍ ተጭነው ስልክ ቁጥርዎን ያጋሩ፤ የነፃ ቦነስ ስጦታዎን በመቀበል ጨዋታውን አሁኑኑ ይጀምሩ!* 🎁",
        {
          parse_mode: "Markdown",
          reply_markup: {
            keyboard: [
              [
                {
                  text: "📱 ስልክ ቁጥርዎን ያጋሩና ቦነስዎን ያግኙ! 🎁",
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    } else if (query.data === "invite_friend") {
      bot.answerCallbackQuery(query.id, {
        text: "መጋበዣ ሊንክ እየተዘጋጀ ነው...",
      });

      const telegramId = String(userId);
      const appUrl = process.env.WEB_APP_URL;
      const botUsername = process.env.BOT_USERNAME || "your_bot_username";

      // Check if user is registered before showing Play Now button
      const isRegistered = await isUserRegistered(telegramId);

      // Create invite link with referrer ID
      const inviteLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;
      const shareText = "ከእኔ ጋር ግዮን BINGO | SPIN ይጫወቱና አሁኑኑ ያሸንፉ! 🎮💰";

      // Build keyboard based on registration status
      const inviteKeyboard = [];

      if (isRegistered) {
        inviteKeyboard.push([
          { text: "🎮 PLAY NOW 🚀", web_app: { url: appUrl } },
          {
            text: "📤 ለጓደኛ ያጋሩ",
            url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`,
          },
        ]);
      } else {
        inviteKeyboard.push([
          {
            text: "📤 ለጓደኛ ያጋሩ",
            url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`,
          },
        ]);
      }

      bot.sendMessage(
        chatId,
        `<b>🎁 የመጋበዣ ሊንክዎን ለጓደኞችዎ ያጋሩ!</b>\n\n🔗 <b>የእርስዎ ሊንክ:</b>\n${inviteLink}\n\n<i>ይህንን ሊንክ ለጓደኞችዎ በመላክ ግዮን ቢንጎን አብረው ይጫወቱ!</i> 🎲✨`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: inviteKeyboard,
          },
        },
      );
    } else if (query.data === "leaderboard") {
      bot.answerCallbackQuery(query.id, { text: "Loading leaderboard..." });

      try {
        // Get top 10 users by totalInvitations
        const topUsers = await prisma.user.findMany({
          orderBy: { totalInvitation: "desc" },
          take: 10,
          select: {
            telegramId: true,
            username: true,
            name: true,
            totalInvitation: true,
            activeInvitation: true,
          },
        });

        let leaderboardText = "🏆 **Top Inviters**\n\n";
        topUsers.forEach((user, index) => {
          const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
          const displayName =
            user.name || user.username || `User ${user.telegramId}`;
          leaderboardText += `${medal} ${index + 1}. ${displayName} - ${user.totalInvitation} invites\n`;
        });

        if (topUsers.length === 0) {
          leaderboardText =
            "🏆 **Leaderboard**\n\nNo invitations yet. Be the first to invite friends!";
        }

        bot.sendMessage(chatId, leaderboardText, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔄 Refresh", callback_data: "leaderboard" },
                { text: "📤 Invite Friend", callback_data: "invite_friend" },
              ],
            ],
          },
        });
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
        bot.sendMessage(
          chatId,
          "❌ Failed to load leaderboard. Please try again.",
        );
      }
    } else if (query.data && query.data.startsWith("copy_")) {
      const referrerId = query.data.replace("copy_", "");
      const botUsername = process.env.BOT_USERNAME;
      const inviteLink = `https://t.me/${botUsername}?start=ref_${referrerId}`;

      bot.answerCallbackQuery(query.id, { text: "ሊንኩን ኮፒ ያድርጉ!" });

      bot.sendMessage(
        chatId,
        `📋 <b>ሊንኩን ኮፒ ያድርጉ 👇</b>\n\n${inviteLink}\n\n<i>ለጓደኞችዎ በመላክ ግዮን ቢንጎን አብረው ይጫወቱ!</i> 🎮✨`,
        { parse_mode: "HTML" }
      );
    } else if (query.data === "play_now") {
      if (userId) {
        const telegramId = String(userId);

        // Check if user is registered
        const isRegistered = await isUserRegistered(telegramId);

        if (!isRegistered) {
          bot.answerCallbackQuery(query.id, {
            text: "⚠️ You need to register first! Please share your contact to register.",
            show_alert: true,
          });
          return;
        }

        try {
          const dbUser = await upsertUser({
            telegramId,
            username: query.from?.username,
            name: nameFromTelegram,
          });
        } catch (err) {
          console.error("Failed to fetch/upsert user from DB", err);
        }
      }

      // User is registered, allow play
      bot.answerCallbackQuery(query.id, { text: "Opening the mini app..." });
      bot.sendMessage(chatId, "Open the mini app:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "▶️ Play Now", web_app: { url: appUrl } }],
          ],
        },
      });
    }
  });

  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;
    if (!contact) return;

    const telegramId = msg.from?.id ? String(msg.from.id) : null;
    const nameFromTelegram =
      [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
      null;
    const nameFromContact =
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null;
    const resolvedName = nameFromContact || nameFromTelegram;

    // Persist user in DB
    if (telegramId) {
      try {
        await upsertUser({
          telegramId,
          username: msg.from?.username,
          name: resolvedName,
          userNumber: contact.phone_number,
        });
      } catch (err) {
        console.error("Failed to persist user contact", err);
        bot.sendMessage(
          chatId,
          "Sorry, we could not save your registration. Please try again.",
        );
        return;
      }
    }

    // Remove the contact sharing keyboard
    const firstName = contact.first_name || msg.from?.first_name || "friend";
    const appUrl = process.env.WEB_APP_URL;

    try {
      // Delete the contact sharing message
      await bot.deleteMessage(chatId, msg.message_id);

      // Get updated keyboard (now user is registered, no register button)
      const keyboard = await getWelcomeKeyboard(telegramId, appUrl);

      // Send new welcome message with updated buttons
      const welcomeMessage = `🎉 <b>ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! ✅</b>

<b>እንኳን በደህና መጡ! 🎲</b>
🔥 <b>አሁን BINGO | SPIN  በመጫወት ዕድልዎን መሞከር ይችላሉ!</b>

💰 <b>ታላላቅ ሽልማቶች ይጠብቁዎታል!</b>
🍀 <b>መልካም ዕድል እና መልካም ጨዋታ! 🚀</b>`;

      // Try to send welcome image again with updated keyboard
      const imagePath = path.join(__dirname, "../../public/welcome.png");

      if (fs.existsSync(imagePath)) {
        await bot.sendPhoto(chatId, fs.createReadStream(imagePath), {
          caption: welcomeMessage,
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      } else {
        // Fallback to text message
        await bot.sendMessage(chatId, welcomeMessage, {
          reply_markup: keyboard,
          parse_mode: "HTML",
        });
      }
    } catch (error) {
      console.error("Error handling post-registration flow:", error);

      // Fallback: just send confirmation message
      bot.sendMessage(
        chatId,
        welcomeMessage,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎮 PLAY NOW", web_app: { url: appUrl } }],
            ],
          },
        },
      );
    }
  });

  // Admin abolbroadcast command - send message with photo to all users (Telegram only)
  bot.onText(/^\/abolbroadcast(.*)/i, async (msg, match) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    // Check if user is admin
    if (!userId || !isAdmin(userId)) {
      bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
      return;
    }

    const broadcastMessage = match[1]?.trim();
    if (!broadcastMessage) {
      bot.sendMessage(
        chatId,
        "❌ Please provide a message to broadcast.\n\nUsage: /abolbroadcast Your message here",
      );
      return;
    }

    await performBroadcast(msg, broadcastMessage, userId, chatId);
  });

  // Handle photo broadcasts (when photo is sent with /abolbroadcast command)
  bot.on("message", async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    // Handle admin broadcast with photo
    if (msg.photo && msg.caption && msg.caption.startsWith("/abolbroadcast")) {
      // Check if user is admin
      if (!userId || !isAdmin(userId)) {
        bot.sendMessage(
          chatId,
          "❌ You are not authorized to use this command.",
        );
        return;
      }

      const broadcastMessage = msg.caption
        .replace(/^\/abolbroadcast\s*/i, "")
        .trim();
      if (!broadcastMessage) {
        bot.sendMessage(
          chatId,
          "❌ Please provide a message to broadcast.\n\nUsage: /abolbroadcast Your message here",
        );
        return;
      }

      await performBroadcast(msg, broadcastMessage, userId, chatId);
      return;
    }

    // Handle combo code claims in group messages.
    if (msg.text && msg.chat && msg.chat.type && msg.chat.type.endsWith("group")) {
      const trimmedText = msg.text.trim();
      const shamoPrefix = trimmedText.match(/^shamo\s+(.+)/i);
      const shamoCode = shamoPrefix?.[1]?.trim();

      if (shamoCode) {
        const telegramId = userId ? String(userId) : null;
        if (!telegramId) {
          bot.sendMessage(chatId, "Could not determine your Telegram ID.");
          return;
        }

        try {
          const result = await claimRewardCombo(telegramId, shamoCode, {
            username: msg.from?.username || null,
            name: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || null,
          });

          if (result.success) {
            await bot.sendMessage(
              chatId,
              `🎉 Congratulations! You claimed ${result.claimedAmount} ETB reward for Shamo combo code: ${shamoCode}`,
            );
          } else {
            await bot.sendMessage(chatId, `⚠️ ${result.error}`);
          }
        } catch (error) {
          console.error('Group claim failed', error);
          await bot.sendMessage(chatId, '❌ Failed to claim the Shamo combo reward. Please try again later.');
        }
      }
    }
  });

  // Helper function to perform broadcast
  const performBroadcast = async (msg, broadcastMessage, userId, chatId) => {
    try {
      // Get all users from database with registration status
      const allUsers = await prisma.user.findMany({
        select: {
          telegramId: true,
          username: true,
          name: true,
          userNumber: true,
        },
      });

      let successCount = 0;
      let failureCount = 0;

      // Send message to all users via Telegram
      for (const user of allUsers) {
        try {
          const isRegistered = Boolean(user.userNumber);

          // Build keyboard based on registration status
          const broadcastKeyboard = [];

          if (isRegistered) {
            broadcastKeyboard.push([
              {
                text: "🎮 Play Now",
                web_app: { url: process.env.WEB_APP_URL },
              },
              {
                text: "💬 Support",
                url:
                  process.env.VITE_TG_SUPPORT_BOT_URL ||
                  "https://t.me/",
              },
            ]);
          } else {
            broadcastKeyboard.push([
              { text: "🎱 START WINNING! ", callback_data: "request_contact" },
              {
                text: "💬 Support",
                url:
                  process.env.VITE_TG_SUPPORT_BOT_URL ||
                  "https://t.me/",
              },
            ]);
          }

          // Escape underscores for MarkdownV2
          function escapeMarkdownV2(text) {
            return text.replace(/([_\-*\[\]()~`>#+=|{}.!])/g, "\\$1");
          }

          const broadcastMessageEscaped = escapeMarkdownV2(broadcastMessage);
          if (msg.photo && msg.photo.length > 0) {
            // If photo is attached to command, send it with enhanced formatting
            const photoCaption = `🎉 አቦል  ቢንጎ \n\n${broadcastMessageEscaped}\n\n`;
            await bot.sendPhoto(
              user.telegramId,
              msg.photo[msg.photo.length - 1].file_id,
              {
                caption: photoCaption,
                parse_mode: "MarkdownV2",
                reply_markup: {
                  inline_keyboard: broadcastKeyboard,
                },
              },
            );
          } else {
            // Send enhanced text message with buttons
            await bot.sendMessage(
              user.telegramId,
              `🌟 ADMIN BROADCAST 🌟\n\n${broadcastMessageEscaped}\n\n`,
              {
                parse_mode: "MarkdownV2",
                reply_markup: {
                  inline_keyboard: broadcastKeyboard,
                },
              },
            );
          }
          successCount++;
        } catch (error) {
          console.error(
            `Failed to send broadcast to user ${user.telegramId}:`,
            error.message,
          );
          failureCount++;
        }
      }

      // Send confirmation to admin
      const adminReport = `✅ **Broadcast Sent Successfully**\n\n📊 **Statistics:**\n• Total Users: ${allUsers.length}\n• ✅ Delivered: ${successCount}\n• ❌ Failed: ${failureCount}\n\n📝 **Message:**\n${broadcastMessage}`;

      if (msg.photo && msg.photo.length > 0) {
        await bot.sendMessage(
          chatId,
          adminReport + "\n\n📷 *Photo was included in broadcast*",
          {
            parse_mode: "Markdown",
          },
        );
      } else {
        await bot.sendMessage(chatId, adminReport, {
          parse_mode: "Markdown",
        });
      }

      console.log(
        `[Admin Broadcast] ${userId} broadcasted message to ${successCount}/${allUsers.length} users`,
      );
    } catch (error) {
      console.error("Error during broadcast:", error);
      bot.sendMessage(chatId, "❌ Failed to send broadcast. Please try again.");
    }
  };
};
