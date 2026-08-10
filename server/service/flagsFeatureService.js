// Service for admin flags: deposit, withdraw, deposit methods
import prisma from '../lib/prisma.js';

export async function getFlags() {
  const withdrawLock = await prisma.withdrawLock.findFirst({ orderBy: { id: 'desc' } });
  const depositMethods = await prisma.depositMethod.findMany();
  return {
    withdrawActive: withdrawLock?.isActive ?? true,
    depositMethods,
  };
}

export async function setWithdrawLock(isActive) {
  // Update the latest lock record or create if none exists
  const existingLock = await prisma.withdrawLock.findFirst({ orderBy: { id: 'desc' } });
  
  if (existingLock) {
    return prisma.withdrawLock.update({
      where: { id: existingLock.id },
      data: { isActive }
    });
  } else {
    return prisma.withdrawLock.create({ data: { isActive } });
  }
}

export async function setDepositMethodActive(id, isActive) {
  return prisma.depositMethod.update({ where: { id }, data: { isActive } });
}

export async function updateDepositMethod(id, data) {
  return prisma.depositMethod.update({ where: { id }, data });
}
