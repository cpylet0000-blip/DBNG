import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function resetBotBalances() {
  try {
    console.log('🤖 Resetting bot player balances...\n');

    const botTelegramIds = (process.env.BOT_ACCOUNTS || '').split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    if (botTelegramIds.length === 0) {
      console.log('❌ No bot accounts configured in BOT_ACCOUNTS');
      return;
    }

    console.log(`📋 Found ${botTelegramIds.length} bot accounts configured`);
    console.log('');

    // Find bot users
    const botUsers = await prisma.user.findMany({
      where: {
        telegramId: {
          in: botTelegramIds
        }
      },
      include: { balance: true }
    });

    console.log(`✅ Found ${botUsers.length} bot users in database\n`);

    if (botUsers.length === 0) {
      console.log('⚠️ No bot users found in database');
      return;
    }

    // Show current balances
    console.log('Current bot balances:');
    let totalBotBalance = 0;
    botUsers.forEach(user => {
      const balance = user.balance?.currentBalance || 0;
      totalBotBalance += balance;
      console.log(`  ${user.telegramId}: ${balance} ETB`);
    });
    console.log(`\nTotal bot balance: ${totalBotBalance} ETB\n`);

    // Reset balances
    console.log('⏳ Resetting bot balances to 0...\n');
    
    for (const user of botUsers) {
      if (user.balance) {
        await prisma.userBalance.update({
          where: { userId: user.id },
          data: {
            currentBalance: 0
          }
        });
        console.log(`  ✓ Reset ${user.telegramId} balance to 0`);
      }
    }

    console.log('\n✨ Bot balances reset successfully!');
    console.log(`💰 Recovered ${totalBotBalance} ETB in earnings calculations\n`);

  } catch (error) {
    console.error('❌ Error resetting bot balances:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetBotBalances();
