import { PrismaClient, Prisma, Transaction } from '@prisma/client';
import { PnL } from '../types';

const prisma = new PrismaClient();

export const pnlService = {
  async findAll(userId?: string) {
    const query: Prisma.PnLFindManyArgs = {
      where: userId ? {
        userPnls: {
          some: {
            userId
          }
        }
      } : undefined,
      include: {
        userPnls: {
          include: {
            user: {
              include: {
                userPlan: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    };
    return prisma.pnL.findMany(query);
  },

  async create(data: Omit<PnL, 'id' | 'createdAt' | 'updatedAt'>) {
    const { userIds, ...pnlData } = data;
    
    const query: Prisma.PnLCreateArgs = {
      data: {
        ...pnlData,
        userPnls: {
          create: userIds.map((userId) => ({
            userId: userId as string,
          })),
        },
      },
      include: {
        userPnls: {
          include: {
            user: {
              select: {
                username: true,
                uniqueId: true,
              },
            },
          },
        },
      },
    };
    
    const pnl = await prisma.pnL.create(query);

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      include: {
        wallet: true,
        userPlan: {
          include: {
            plan: true,
          },
        },
      },
    });

    Promise.all(users.map(async (user) => {
      return await this.createTransaction({
        walletId: user.wallet?.id || '',
        type: 'DEPOSIT',
        amount: pnl.totalPnL * (user.userPlan?.plan.profitSharingCustomer || 0) / 100,
        status: 'SUCCESS',
        description: `PnL for ${user.username}`,
      });
    }));

    return pnl;
  },

  async update(id: string, data: Partial<PnL>) {
    const { userIds, ...pnlData } = data;

    if (userIds) {
      await prisma.userPnL.deleteMany({
        where: { pnlId: id },
      });
    }

    const query: Prisma.PnLUpdateArgs = {
      where: { id },
      data: {
        ...pnlData,
        ...(userIds && {
          userPnls: {
            create: userIds.map((userId) => ({
              userId: userId as string,
            })),
          },
        }),
      },
      include: {
        userPnls: {
          include: {
            user: {
              select: {
                username: true,
                uniqueId: true,
              },
            },
          },
        },
      },
    };
    return prisma.pnL.update(query);
  },

  async delete(id: string) {
    await prisma.userPnL.deleteMany({
      where: { pnlId: id },
    });

    return prisma.pnL.delete({
      where: { id },
    });
  },
  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const transaction = await prisma.transaction.create({
      data,
    });

    const wallet = await prisma.wallet.findUnique({
      where: { id: data.walletId },
    });

    if (wallet) {
      wallet.balance += data.amount;
      await prisma.wallet.update({ where: { id: data.walletId }, data: { balance: wallet.balance } });
    }
    return transaction;
  },
}; 
