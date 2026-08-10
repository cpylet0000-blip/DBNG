import prisma from "../lib/prisma.js";

// ==============================
// HELPER FUNCTION: Generate Bingo Card
// ==============================
function generateBingoCard() {
  const card = [];
  const columnRanges = [
    [1, 15], // B
    [16, 30], // I
    [31, 45], // N
    [46, 60], // G
    [61, 75], // O
  ];
  for (let col = 0; col < 5; col++) {
    const [min, max] = columnRanges[col];
    const available = [];
    for (let i = min; i <= max; i++) {
      available.push(i);
    }

    // Pick 5 unique numbers from this column
    for (let row = 0; row < 5; row++) {
      const idx = Math.floor(Math.random() * available.length);
      card.push(available[idx]);
      available.splice(idx, 1);
    }
  }

  return card;
}

// ==============================
// SEED DEPOSIT METHODS
// ==============================
async function seedDepositMethods() {
  console.log("💳 Seeding Deposit Methods...");

  await prisma.depositMethod.deleteMany({});

  const depositMethods = [
    {
      name: "CBE",
      accountInfo: "1000123456789",
      accountOwner: "Game Platform Account",
      isActive: true,
    },
    {
      name: "BOA",
      accountInfo: "2000987654321",
      accountOwner: "Game Platform Account",
      isActive: true,
    },
    {
      name: "Telebirr",
      accountInfo: "0911234567",
      accountOwner: "Game Platform Telebirr",
      isActive: true,
    },
    {
      name: "Awash Bank",
      accountInfo: "3000555666777",
      accountOwner: "Game Platform Account",
      isActive: true,
    },
  ];

  const createdMethods = await prisma.depositMethod.createMany({
    data: depositMethods,
  });

  console.log(`✅ Created ${createdMethods.count} deposit methods`);
}

// ==============================
// SEED WITHDRAW LOCK
// ==============================
async function seedWithdrawLock() {
  console.log("🔒 Seeding Withdraw Lock...");

  await prisma.withdrawLock.deleteMany({});

  const withdrawLock = await prisma.withdrawLock.create({
    data: {
      isActive: false, // Initially unlocked
    },
  });

  console.log("✅ Withdraw lock created (status: unlocked)");
}

// ==============================
// SEED REWARD RULES
// ==============================
async function seedRewardRules() {
  console.log("🎁 Seeding Reward Rules...");

  await prisma.rewardRule.deleteMany({});

  const rewardRules = [
    {
      numberOfGamePlay: 5,
      rewardAmount: 10,
      totalPlayerForReward: 100,
      claimedCount: 0,
      comboCode: "PLAY5WIN10",
      status: "active",
    },
    {
      numberOfGamePlay: 10,
      rewardAmount: 25,
      totalPlayerForReward: 50,
      claimedCount: 0,
      comboCode: "PLAY10WIN25",
      status: "active",
    },
    {
      numberOfGamePlay: 20,
      rewardAmount: 50,
      totalPlayerForReward: 25,
      claimedCount: 0,
      comboCode: "PLAY20WIN50",
      status: "active",
    },
    {
      numberOfGamePlay: 50,
      rewardAmount: 100,
      totalPlayerForReward: 10,
      claimedCount: 0,
      comboCode: "PLAY50WIN100",
      status: "active",
    },
  ];

  const createdRules = await prisma.rewardRule.createMany({
    data: rewardRules,
  });

  console.log(`✅ Created ${createdRules.count} reward rules`);
}

// ==============================
// SEED BINGO CARDS
// ==============================
async function seedBingoCards() {
  console.log("🎲 Seeding Bingo Cards...");

  await prisma.bingoCard.deleteMany({});

  const stakes = [10, 20, 50, 100];
  const NUM_CARDS = 200;

  // Generate 200 unique cards (numbers only, no stake)
  const baseCards = [];
  for (let cardId = 1; cardId <= NUM_CARDS; cardId++) {
    const numbers = generateBingoCard();
    baseCards.push({ cardId, numbers: JSON.stringify(numbers) });
  }

  let totalCreated = 0;

  // For each stake, insert the same 200 cards
  for (const stake of stakes) {
    const cards = baseCards.map((card) => ({
      cardId: card.cardId,
      stake,
      numbers: card.numbers,
    }));
    await prisma.bingoCard.createMany({ data: cards });
    totalCreated += cards.length;
  }

  console.log(
    `✅ Created ${totalCreated} bingo cards (${NUM_CARDS} cards × ${stakes.length} stakes)`,
  );
}

// ==============================
// SEED ADMIN USER
// ==============================
async function seedAdminUser() {
  console.log("👤 Seeding admin user...");

  const email = "Dawit1200@gmail.com";
  const password = "Dawit@2026";

  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 10);

  // Delete old admin user
  await prisma.adminUser.deleteMany({
    where: { email: "admin1200@gmail.com" },
  });

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    await prisma.adminUser.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log("✅ Existing admin user updated");
  } else {
    await prisma.adminUser.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    console.log("✅ Admin user created");
  }
}

// ==============================
// SEED GAMES (Bingo, Keno)
// ==============================
async function seedGames() {
  console.log("🎮 Seeding games (Bingo, Keno)...");

  const games = [
    {
      name: "Bingo",
      image: "bingo.jpg",
      to: "/games/bingo",
      fullWidth: false,
      numberOfPlayed: 0,
      status: "PAUSED",
    },
    {
      name: "Spin",
      image: "spin.jpg",
      to: "/games/#",
      fullWidth: false,
      numberOfPlayed: 0,
      status: "PAUSED",
    },
  ];

  for (const g of games) {
    await prisma.game.upsert({
      where: { name: g.name },
      update: g,
      create: g,
    });
    console.log(`✅ Upserted game: ${g.name}`);
  }
}

// ==============================
// MAIN SEED FUNCTION
// ==============================
async function main() {
  console.log("\n🌱 Starting database seeding...\n");

  try {
    await seedDepositMethods();
    await seedWithdrawLock();
    await seedRewardRules();
    await seedBingoCards();
    await seedAdminUser();
    await seedGames();

    console.log("\n✨ Database seeding completed successfully!\n");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("❌ Fatal seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
