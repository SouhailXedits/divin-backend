import { Router } from 'express';
import { accountService } from '../services/accountService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { skip, take, status, userId } = req.query;
    const accounts = await accountService.findAll({
      skip: skip ? parseInt(skip as string) : undefined,
      take: take ? parseInt(take as string) : undefined,
      status: status as string,
      userId: userId as string,
    });
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { userId, accountNo, server, password } = req.body;
    const account = await accountService.create({
      userId,
      accountNo,
      server,
      password,
    });
    res.json(account);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const account = await accountService.updateStatus(id, status);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await accountService.delete(id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router; 