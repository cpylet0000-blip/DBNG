import prisma from "../lib/prisma.js";

export async function getPendingRequests() {
  const [deposits, withdrawals] = await Promise.all([
    prisma.depositRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { user: { include: { balance: true } } },
    }),
    prisma.withdrawRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { user: { include: { balance: true } } },
    }),
  ]);

  // Flatten balance to user object for frontend
  const mapBalance = (arr) =>
    arr.map((req) => ({
      ...req,
      user: {
        ...req.user,
        balance: req.user?.balance?.currentBalance ?? null,
      },
    }));

  return {
    deposits: mapBalance(deposits),
    withdrawals: mapBalance(withdrawals),
  };
}

export async function getAllRequests() {
  const [deposits, withdrawals] = await Promise.all([
    prisma.depositRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, telegramId: true },
        },
      },
    }),
    prisma.withdrawRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, username: true, name: true, telegramId: true },
        },
      },
    }),
  ]);

  // Ensure user object always has username and name (may be null)
  const mapUser = (arr) =>
    arr.map((req) => ({
      ...req,
      user: {
        id: req.user?.id ?? null,
        username: req.user?.username ?? null,
        name: req.user?.name ?? null,
        telegramId: req.user?.telegramId ?? null,
      },
    }));

  return {
    deposits: mapUser(deposits),
    withdrawals: mapUser(withdrawals),
  };
}

export async function approveDeposit(id) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.depositRequest.findUnique({
      where: { id },
      include: { user: { include: { balance: true } } },
    });
    if (!req) throw new Error("Deposit request not found");
    if (req.status !== "pending") return req;

    const userId = req.userId;
    const amount = req.amount;

    let balance = req.user.balance;
    if (!balance) {
      balance = await tx.userBalance.create({
        data: { userId, currentBalance: 5 },
      });
    }

    const previousTotalDeposits = Number(balance.totalDeposits || 0);
    const currentBalance = Number(balance.currentBalance || 0);
    const shouldSplitForBudget =
      previousTotalDeposits === 0 && currentBalance > 10;

    if (shouldSplitForBudget) {
      const halfForReward = currentBalance / 2;
      const halfForCurrent = currentBalance - halfForReward;

      await tx.userBalance.update({
        where: { userId },
        data: {
          totalDeposits: { increment: amount },
          currentBalance: halfForCurrent + amount,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          rewardBalance: { increment: halfForReward },
        },
      });
    } else {
      await tx.userBalance.update({
        where: { userId },
        data: {
          totalDeposits: { increment: amount },
          currentBalance: { increment: amount },
        },
      });

      // Keep the existing 10% reward rule for all other cases.
      await tx.user.update({
        where: { id: userId },
        data: {
          rewardBalance: { increment: Math.floor(amount * 0.1) },
        },
      });
    }
    // Check if transaction already exists
    if (req.transactionId) {
      const existingTransaction = await tx.transaction.findFirst({
        where: { transactionId: req.transactionId },
      });

      if (!existingTransaction) {
        // Only create transaction if it doesn't exist
        const txData = {
          userId: Number(userId),
          amount: Number(req.amount),
          transactionId: req.transactionId,
          paymentDateTime: req.paymentDateTime || "date",
          receiver: req.receiver || "manual",
          account: req.account || "manual",
        };
        await tx.transaction.create({
          data: txData,
        });
      }
    }

    return tx.depositRequest.update({
      where: { id },
      data: { status: "approved" },
    });
  });
}

export async function rejectDeposit(id) {
  return prisma.depositRequest.update({
    where: { id },
    data: { status: "rejected" },
  });
}

export async function approveWithdrawal(id) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.withdrawRequest.findUnique({
      where: { id },
      include: { user: { include: { balance: true } } },
    });
    if (!req) throw new Error("Withdraw request not found");
    if (req.status !== "pending") return req;

    const userId = req.userId;
    const amount = req.amount;

    let balance = req.user.balance;
    if (!balance) {
      balance = await tx.userBalance.create({
        data: { userId, currentBalance: 5 },
      });
    }

    if (balance.currentBalance < amount) {
      throw new Error("Insufficient balance");
    }

    await tx.userBalance.update({
      where: { userId },
      data: {
        currentBalance: { decrement: amount },
      },
    });

    return tx.withdrawRequest.update({
      where: { id },
      data: { status: "approved" },
    });
  });
}

export async function rejectWithdrawal(id) {
  return prisma.withdrawRequest.update({
    where: { id },
    data: { status: "rejected" },
  });
}
