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
    let totalDivineAlgoShare = 0;
    
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
        referralsAsCustomer: {
          include: {
            agent: {
              include: {
                wallet: true,
              },
            },
          },
        },
      },
    });

    Promise.all(
      users.map(async (user) => {
        const customerPnl = pnl.totalPnL * (user.userPlan?.plan.profitSharingCustomer || 0) / 100;
        const platformPnl = pnl.totalPnL * (user.userPlan?.plan.profitSharingPlatform || 0) / 100;
        if(user.referralsAsCustomer.length > 0) {
          totalDivineAlgoShare += platformPnl * 70 / 100;
          
          // Calculate agent earnings (30% of platform share)
          const agentEarnings = platformPnl * 30 / 100;
          
          // Update the referral record with the agent's earnings
          await Promise.all(
            user.referralsAsCustomer.map(async (referral) => {
              // Update agentTotalEarnings using executeRaw to avoid type issues
              await prisma.$executeRaw`
                UPDATE "Referral" 
                SET "agentTotalEarnings" = "agentTotalEarnings" + ${agentEarnings} 
                WHERE "id" = ${referral.id}
              `;
              
              // Optional: Create transaction for the agent's wallet
              if (referral.agent?.wallet?.id) {
                await this.createPnlTransaction({
                  walletId: referral.agent.wallet.id,
                  type: 'DEPOSIT',
                  amount: agentEarnings,
                  status: 'SUCCESS',
                  description: `PnL for referral of ${user.username}`,
                });
              }
            })
          );
        } else {
          totalDivineAlgoShare += platformPnl;
        }
        await this.createPnlTransaction({
          walletId: user.wallet?.id || '',
          type: 'WITHDRAWAL',
          amount: platformPnl,
          status: 'SUCCESS',
          description: `PnL for ${user.username}`,
        });
        console.log('reffered by', user.referralsAsCustomer);

        // await Promise.all(
        //   user.referralsAsCustomer.map(async (referral) => {
        //     await this.createPnlTransaction({
        //       walletId: referral.agent?.wallet?.id || '',
        //       type: 'WITHDRAWAL',
        //       amount: (pnl.totalPnL * (user.userPlan?.plan.profitSharingPlatform || 0) / 100) * 30 / 100,
        //       status: 'SUCCESS',
        //       description: `PnL for ${user.username}`,
        //     });
        //   })
        // );
      })
    );
    // update divine algo share
    await prisma.pnL.update({
      where: { id: pnl.id },
      data: {
        divineAlgoShare: totalDivineAlgoShare,
      },
    });

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
  async createPnlTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const transaction = await prisma.transaction.create({
      data,
    });

    const wallet = await prisma.wallet.findUnique({
      where: { id: data.walletId },
    });

    if (wallet) {
      if(data.type === 'DEPOSIT') {
        wallet.balance += data.amount;
      } else {
        wallet.balance -= data.amount;
      }
      await prisma.wallet.update({ where: { id: data.walletId }, data: { balance: wallet.balance } });
    }
    return transaction;
  },
}; 
