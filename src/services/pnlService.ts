import { PrismaClient } from '@prisma/client';
import { PnL } from '../types';

const prisma = new PrismaClient();

export const pnlService = {
  async findAll(userId?: string) {
    return prisma.pnL.findMany({
      where: {
        userId: userId as string | undefined,
      },
      include: {
        user: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  },

  async create(data: Omit<PnL, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.pnL.create({
      data,
      include: {
        user: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
    });
  },

  async update(id: string, data: Partial<PnL>) {
    return prisma.pnL.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
    });
  },

  async delete(id: string) {
    return prisma.pnL.delete({
      where: { id },
    });
  },
}; 