import { PrismaClient } from "@prisma/client";
import { User, UserRole, UserStatus } from "../types";

const prisma = new PrismaClient();

export const userService = {
  async findAll() {
    return prisma.user.findMany({
      include: {
        accounts: true,
        wallet: true,
        userPlan: {
          include: {
            plan: true,
          },
        },
        referralsAsAgent: {
          include: {
            agent: true,
            customer: true,
          },
        },
        referralsAsCustomer: {
          include: {
            agent: true,
            customer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true,
        wallet: true,
        userPlan: {
          include: {
            plan: true,
          },
        },
      },
    });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async findByUniqueId(uniqueId: string) {
    return prisma.user.findUnique({
      where: { uniqueId },
      include: {
        userPlan: {
          include: {
            plan: true,
          },
        },
      },
    });
  },

  async create(data: {
    id: string;
    username: string;
    email: string;
    phoneCode: string;
    phone: string;
    status: UserStatus;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        uniqueId: `C${Math.floor(1000 + Math.random() * 9000)}`,
        role: UserRole.CUSTOMER,
      },
    });
  },

  async updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  },

  async updateRole(uniqueId: string, role: UserRole) {
    return prisma.user.update({
      where: { uniqueId },
      data: { role },
    });
  },

  async update(id: string, data: Partial<User>) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.account.deleteMany({
        where: { userId: id },
      });

      await tx.wallet.deleteMany({
        where: { userId: id },
      });

      await tx.userPlan.deleteMany({
        where: { userId: id },
      });

      await tx.referral.deleteMany({
        where: {
          OR: [{ agentId: id }, { customerId: id }],
        },
      });

      return tx.user.delete({
        where: { id },
      });
    });
  },

  async assignPlan(userId: string, planId: string) {
    // Check if user already has a plan
    const existingPlan = await prisma.userPlan.findUnique({
      where: { userId },
    });

    if (existingPlan) {
      // Update existing plan
      return prisma.userPlan.update({
        where: { userId },
        data: {
          planId,
          status: "PENDING",
          updatedAt: new Date(),
        },
        include: {
          plan: true,
        },
      });
    }

    // Create new plan assignment
    return prisma.userPlan.create({
      data: {
        userId,
        planId,
        status: "PENDING",
      },
      include: {
        plan: true,
      },
    });
  },

  async updatePlan(userId: string, planId: string) {
    return prisma.userPlan.update({
      where: { userId },
      data: { planId },
    });
  },

  async removePlan(userId: string) {
    return prisma.userPlan.delete({
      where: { userId },
    });
  },
};
