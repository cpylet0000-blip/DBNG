import prisma from "../lib/prisma.js";

const normalizeComboCode = (code) => String(code || "").trim();

export const findActiveRewardRuleByComboCode = async (comboCode) => {
  const normalizedComboCode = normalizeComboCode(comboCode);
  if (!normalizedComboCode) return null;

  return prisma.rewardRule.findFirst({
    where: {
      status: "active",
      comboCode: normalizedComboCode,
    },
    orderBy: { id: "desc" },
  });
};

export const findActiveRewardRule = async () => {
  return prisma.rewardRule.findFirst({
    where: {
      status: "active",
      comboCode: { not: null },
    },
    orderBy: { id: "desc" },
  });
};

export const claimRewardCombo = async (
  telegramId,
  comboCode,
  { username = null, name = null } = {},
) => {
  const normalizedComboCode = normalizeComboCode(comboCode);
  if (!normalizedComboCode) {
    return { success: false, error: "Invalid combo code." };
  }

  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { balance: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: username || null,
        name: name || null,
      },
      include: { balance: true },
    });
  }

  const rule = await prisma.rewardRule.findFirst({
    where: {
      status: "active",
      comboCode: normalizedComboCode,
    },
    orderBy: { id: "desc" },
  });

  if (!rule) {
    return { success: false, error: "Invalid combo code." };
  }

  const existingClaim = await prisma.reward.findFirst({
    where: {
      userId: user.id,
      ruleId: rule.id,
      status: "claimed",
    },
    select: { id: true },
  });

  if (existingClaim) {
    return { success: false, error: "You already claimed this reward rule." };
  }

  if (rule.totalPlayerForReward > 0 && rule.claimedCount >= rule.totalPlayerForReward) {
    return { success: false, error: "Reward limit has been reached. No more claims available." };
  }

  if ((user.numberOfTotalPlay ?? 0) < rule.numberOfGamePlay) {
    return {
      success: false,
      error: `You need to play at least ${rule.numberOfGamePlay} games to claim the challenge reward.`,
    };
  }

  if ((user.rewardChallenge ?? 0) < rule.numberOfGamePlay) {
    return {
      success: false,
      error: `You need at least ${rule.numberOfGamePlay} challenge plays to claim.`,
    };
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.reward.create({
      data: {
        userId: user.id,
        ruleId: rule.id,
        numberOfgamePlayed: user.numberOfTotalPlay ?? 0,
        status: "claimed",
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        rewardBalance: { increment: rule.rewardAmount },
        rewardChallenge: 0,
      },
    }),
    prisma.rewardRule.update({
      where: { id: rule.id },
      data: {
        claimedCount: { increment: 1 },
        status:
          rule.totalPlayerForReward > 0 &&
          rule.claimedCount + 1 >= rule.totalPlayerForReward
            ? "inactive"
            : rule.status,
      },
    }),
  ]);

  return {
    success: true,
    claimedAmount: rule.rewardAmount,
    newRewardBalance: updatedUser.rewardBalance,
  };
};
