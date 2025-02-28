import { Router } from 'express';
import { pnlService } from '../services/pnlService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.query;
    const pnlData = await pnlService.findAll(userId as string);
    res.json(pnlData);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { userIds, date, symbol, totalPnL, customerShare, divineAlgoShare } = req.body;
    const pnl = await pnlService.create({
      userIds,
      date: new Date(date),
      symbol,
      totalPnL,
      customerShare,
      divineAlgoShare,
    });
    res.status(201).json(pnl);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, symbol, totalPnL, customerShare, divineAlgoShare } = req.body;
    const pnl = await pnlService.update(id, {
      ...(date && { date: new Date(date) }),
      ...(symbol && { symbol }),
      ...(totalPnL !== undefined && { totalPnL }),
      ...(customerShare !== undefined && { customerShare }),
      ...(divineAlgoShare !== undefined && { divineAlgoShare }),
    });
    res.json(pnl);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pnlService.delete(id);
    res.json({ message: 'PnL entry deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router; 