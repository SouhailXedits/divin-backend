import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean the database
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.chat.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.pnL.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.account.deleteMany(),
    prisma.userPlan.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create plans
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Silver',
        minDeposit: 1000,
        maxDeposit: 5000,
        maxAccounts: 2,
        profitSharingCustomer: 70,
        profitSharingPlatform: 30,
        upfrontFee: 100,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Gold',
        minDeposit: 5000,
        maxDeposit: 20000,
        maxAccounts: 5,
        profitSharingCustomer: 75,
        profitSharingPlatform: 25,
        upfrontFee: 200,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Platinum',
        minDeposit: 20000,
        maxDeposit: 100000,
        maxAccounts: 10,
        profitSharingCustomer: 80,
        profitSharingPlatform: 20,
        upfrontFee: 500,
      },
    }),
  ]);

  // Create users with different roles
  const admin = await prisma.user.create({
    data: {
      uniqueId: 'A1001',
      username: 'admin',
      email: 'admin@divinealgo.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      phoneCode: '+1',
      phone: '1234567890',
    },
  });

  const manager = await prisma.user.create({
    data: {
      uniqueId: 'M1001',
      username: 'manager',
      email: 'manager@divinealgo.com',
      role: 'MANAGER',
      status: 'ACTIVE',
      phoneCode: '+1',
      phone: '2345678901',
    },
  });

  const agent = await prisma.user.create({
    data: {
      uniqueId: 'AG1001',
      username: 'agent',
      email: 'agent@divinealgo.com',
      role: 'AGENT',
      status: 'ACTIVE',
      phoneCode: '+1',
      phone: '3456789012',
    },
  });

  // Create 5 customers
  const customers = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const customer = await prisma.user.create({
        data: {
          uniqueId: `C${1001 + i}`,
          username: `customer${i + 1}`,
          email: `customer${i + 1}@example.com`,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          phoneCode: '+1',
          phone: `4${i}56789012`,
        },
      });

      // Create wallet for each customer
      const wallet = await prisma.wallet.create({
        data: {
          userId: customer.uniqueId,
          balance: 1000 * (i + 1),
        },
      });

      // Create some transactions
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: 1000 * (i + 1),
          status: 'COMPLETED',
          description: 'Initial deposit',
        },
      });

      // Assign plan to customer
      await prisma.userPlan.create({
        data: {
          userId: customer.id,
          planId: plans[i % 3].id,
          status: 'ACTIVE',
        },
      });

      // Create trading accounts
      await prisma.account.create({
        data: {
          userId: customer.id,
          accountNo: `MT4${10001 + i}`,
          server: 'MT4-Live',
          password: 'pass123',
          status: 'APPROVED',
        },
      });

      // Create PnL records
      const dates = Array.from({ length: 30 }, (_, j) => {
        const date = new Date();
        date.setDate(date.getDate() - j);
        return date;
      });

      await Promise.all(
        dates.map((date) =>
          prisma.pnL.create({
            data: {
              userId: customer.id,
              date,
              symbol: 'EURUSD',
              totalPnL: Math.random() * 1000 - 200, // Random PnL between -200 and 800
              customerShare: 70,
              divineAlgoShare: 30,
            },
          })
        )
      );

      return customer;
    })
  );

  // Create referrals
  await Promise.all(
    customers.slice(0, 3).map((customer) =>
      prisma.referral.create({
        data: {
          agentId: agent.id,
          customerId: customer.id,
          isActive: true,
        },
      })
    )
  );

  // Create chats and messages
  await Promise.all(
    customers.map(async (customer) => {
      const chat = await prisma.chat.create({
        data: {
          customerId: customer.id,
          lastMessage: 'Hello, how can I help you today?',
          unreadCount: 1,
        },
      });

      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: manager.id,
          content: 'Hello, how can I help you today?',
        },
      });
    })
  );

  console.log('Database has been seeded! 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 