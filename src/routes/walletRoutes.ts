import { Router } from 'express';
import { walletService } from '../services/walletService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const wallets = await walletService.findAll();
    res.json(wallets);
  } catch (error) {
    next(error);
  }
});

router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const wallet = await walletService.findByUserId(userId);
    
    if (!wallet) {
      throw new AppError('Wallet not found', 404);
    }
    
    res.json(wallet);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { userId, balance } = req.body;
    const wallet = await walletService.create({ userId, balance });
    res.status(201).json(wallet);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/archive', async (req, res, next) => {
  try {
    const { id } = req.params;
    const wallet = await walletService.archive(id);
    res.json(wallet);
  } catch (error) {
    next(error);
  }
});

router.patch('/:userId/balance', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { balance } = req.body;
    const wallet = await walletService.updateBalance(userId, balance);
    res.json(wallet);
  } catch (error) {
    next(error);
  }
});

router.post('/transactions', async (req, res, next) => {

  try {
    const { walletId, type, amount, description } = req.body;

    const transaction = await walletService.createTransaction({
      walletId,
      type,
      amount,
      description,
    });
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.patch('/transactions/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const transaction = await walletService.updateTransactionStatus(id, status);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/unarchive', async (req, res, next) => {
  try {
    const { id } = req.params;
    const wallet = await walletService.unarchive(id);
    res.json(wallet);
  } catch (error) {
    next(error);
  }
});

export default router; 