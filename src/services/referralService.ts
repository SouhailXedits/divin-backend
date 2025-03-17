import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const referralService = {
  async findAll() {
    return prisma.referral.findMany({
      include: {
        agent: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
        customer: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findByAgentId(agentId: string) {
    return prisma.referral.findMany({
      where: { agentId },
      include: {
        customer: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async create(data: {
    agentUniqueId: string;
    customerUniqueId: string;
    isManualAssignment?: boolean;
  }) {
    const { agentUniqueId, customerUniqueId, isManualAssignment = false } = data;

    // Find agent by uniqueId
    const agent = await prisma.user.findUnique({
      where: { uniqueId: agentUniqueId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // For dummy referrals (when creating a new agent), we don't need to check for customer
    const isDummyReferral = customerUniqueId.startsWith('DUMMY_');
    let customerId = '';

    if (isDummyReferral) {
      // For dummy referrals, use the agent's own ID as customer ID
      customerId = agent.id;
    } else {
      // Find customer by uniqueId
      const customer = await prisma.user.findUnique({
        where: { id: customerUniqueId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Check if referral already exists
      const existingReferral = await prisma.referral.findFirst({
        where: {
          customerId: customer.id,
        },
      });

      if (existingReferral) {
        throw new Error('Customer is already referred by an agent');
      }

      customerId = customer.id;
    }

    return prisma.referral.create({
      data: {
        agentId: agent.id,
        customerId,
        isManualAssignment,
        isActive: true,
      },
      include: {
        agent: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
        customer: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
    });
  },

  async activate(id: string) {
    return prisma.referral.update({
      where: { id },
      data: { isActive: true },
      include: {
        agent: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
        customer: {
          select: {
            username: true,
            uniqueId: true,
          },
        },
      },
    });
  },

  async getAgentTotalEarnings(agentId: string) {
    // Use a raw SQL query to sum up all earnings for an agent
    const result = await prisma.$queryRaw<[{ totalEarnings: number | null }]>`
      SELECT SUM("agentTotalEarnings") as "totalEarnings"
      FROM "Referral"
      WHERE "agentId" = ${agentId}
    `;
    
    // result will be an array with one object like [{ totalEarnings: 123.45 }]
    const totalEarnings = result[0]?.totalEarnings || 0;
    
    return Number(totalEarnings);
  },
}; 