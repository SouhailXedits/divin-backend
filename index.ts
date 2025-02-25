import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// Get accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const { skip, take, status, userId } = req.query;
    
    const accounts = await prisma.account.findMany({
      skip: skip ? parseInt(skip as string) : 0,
      take: take ? parseInt(take as string) : 10,
      where: {
        status: status as string | undefined,
        userId: userId as string | undefined,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Failed to fetch accounts', error: error instanceof Error ? error.message : String(error) });
  }
});

// Create account
app.post('/api/accounts', async (req, res) => {
  try {
    console.log("Creating account");
    const { userId, accountNo, server, password } = req.body;

    // Check user's plan limits
    // const userWithPlan = await prisma.user.findUnique({
    //   where: { id: userId },
    //   include: {
    //     accounts: true,
    //     userPlan: {
    //       include: {
    //         plan: true,
    //       },
    //     },
    //   },
    // });
    // console.log(userWithPlan);

    // if (!userWithPlan?.userPlan) {
    //   return res.status(400).json({ message: 'User has no active plan' });
    // }

    // if (userWithPlan.accounts.length >= userWithPlan.userPlan.plan.maxAccounts) {
    //   return res.status(400).json({ message: 'Maximum account limit reached for current plan' });
    // }

    const account = await prisma.account.create({
      data: {
        userId,
        accountNo,
        server,
        password,
      },
      include: {
        user: true,
      },
    });

    res.json(account);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create account' });
  }
});

// Update account status
app.patch('/api/accounts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const account = await prisma.account.update({
      where: { id },
      data: { status: status as string },
      include: {
        user: true,
      },
    });

    res.json(account);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update account status' });
  }
});

// Add users endpoints
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
        wallet: true,
        userPlan: {
          include: {
            plan: true
          }
        },
        referralsAsAgent: true,
        referralsAsCustomer: true
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error instanceof Error ? error.message : String(error) });
  }
});

app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// Add referrals endpoint
app.get('/api/referrals', async (req, res) => {
  try {
    const referrals = await prisma.referral.findMany({
      include: {
        agent: true,
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(referrals);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ message: 'Failed to fetch referrals' });
  }
});

// Plan Management Endpoints
app.get('/api/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ message: 'Failed to fetch plans', error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/plans', async (req, res) => {
  try {
    const {
      name,
      minDeposit,
      maxDeposit,
      maxAccounts,
      profitSharingCustomer,
      profitSharingPlatform,
      upfrontFee,
    } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        minDeposit,
        maxDeposit,
        maxAccounts,
        profitSharingCustomer,
        profitSharingPlatform,
        upfrontFee,
      },
    });

    res.json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: 'Failed to create plan', error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      minDeposit,
      maxDeposit,
      maxAccounts,
      profitSharingCustomer,
      profitSharingPlatform,
      upfrontFee,
    } = req.body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        minDeposit,
        maxDeposit,
        maxAccounts,
        profitSharingCustomer,
        profitSharingPlatform,
        upfrontFee,
      },
    });

    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Failed to update plan', error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are any users using this plan
    const usersWithPlan = await prisma.userPlan.findFirst({
      where: { planId: id },
    });

    if (usersWithPlan) {
      return res.status(400).json({ message: 'Cannot delete plan while users are subscribed to it' });
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: 'Failed to delete plan', error: error instanceof Error ? error.message : String(error) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 