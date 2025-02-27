import { PrismaClient } from '@prisma/client';
import { TransactionType } from '../types';

const prisma = new PrismaClient();

export const walletService = {
  async findAll() {
    return prisma.wallet.findMany({
      include: {
        user: true,
      },
    });
  },

  async findByUserId(userId: string) {
    return prisma.wallet.findFirst({
      where: { 
        userId,
        archivedAt: null
      },
      include: {
        user: true,
      },
    });
  },

  async create(data: { userId: string; balance?: number }) {
    // Check if user exists and is active
    const user = await prisma.user.findFirst({
      where: { 
        uniqueId: data.userId,
        status: 'ACTIVE'
      }
    });
    if (!user) {
      throw new Error('Active user not found');
    }

    // Check if wallet already exists
    const existingWallet = await this.findByUserId(data.userId);
    if (existingWallet) {
      throw new Error('User already has an active wallet');
    }

    return prisma.wallet.create({
      data: {
        userId: data.userId,
        balance: data.balance || 0
      },
      include: {
        user: true
      }
    });
  },

  async archive(id: string) {
    return prisma.wallet.update({
      where: { id },
      data: {
        archivedAt: new Date()
      },
      include: {
        user: true
      }
    });
  },

  async updateBalance(userId: string, balance: number) {
    return prisma.wallet.update({
      where: { userId },
      data: { balance },
      include: {
        user: true,
      },
    });
  },

  async createTransaction(data: {
    walletId: string;
    type: TransactionType;
    amount: number;
    description: string;
  }) {
    const { walletId, type, amount, description } = data;

    // Start a transaction
    return prisma.$transaction(async (tx) => {
      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          walletId,
          type,
          amount,
          description,
        },
      });

      // Get current wallet
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Update wallet balance
      const newBalance = type === TransactionType.DEPOSIT
        ? wallet.balance + amount
        : wallet.balance - amount;

      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: newBalance,
          updatedAt: new Date(),
        },
      });

      return transaction;
    });
  },
}; 