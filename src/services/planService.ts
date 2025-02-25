import { PrismaClient } from '@prisma/client';
import { Plan } from '../types';

const prisma = new PrismaClient();

export const planService = {
  async findAll() {
    return prisma.plan.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.plan.create({
      data,
    });
  },

  async update(id: string, data: Partial<Plan>) {
    return prisma.plan.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    // Check if there are any users using this plan
    const usersWithPlan = await prisma.userPlan.findFirst({
      where: { planId: id },
    });

    if (usersWithPlan) {
      throw new Error('Cannot delete plan while users are subscribed to it');
    }

    return prisma.plan.delete({
      where: { id },
    });
  },

  async findById(id: string) {
    return prisma.plan.findUnique({
      where: { id },
    });
  },
}; 