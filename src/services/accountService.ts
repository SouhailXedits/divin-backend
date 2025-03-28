import { PrismaClient } from '@prisma/client';
import { AccountStatus } from '../types';

const prisma = new PrismaClient();

export const accountService = {
  async findAll(params: {
    skip?: number;
    take?: number;
    status?: string;
    userId?: string;
  }) {
    const { skip, take, status, userId } = params;
    
    return prisma.account.findMany({
      skip: skip || 0,
      take: take || 10,
      where: {
        status: status as AccountStatus | undefined,
        userId,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async create(data: {
    userId: string;
    accountNo: string;
    server: string;
    password: string;
  }) {
    return prisma.account.create({
      data: {
        ...data,
        status: AccountStatus.PENDING,
      },
      include: {
        user: true,
      },
    });
  },

  async updateStatus(id: string, status: AccountStatus) {
    return prisma.account.update({
      where: { id },
      data: { status },
      include: {
        user: true,
      },
    });
  },

  async update(id: string, data: {
    accountNo: string;
    server: string;
    password: string;
  }) {
    return prisma.account.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.account.delete({
      where: { id },
    });
  },

  async findByUserId(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      include: {
        user: true,
      },
    });
  },

  async findById(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  },
}; 