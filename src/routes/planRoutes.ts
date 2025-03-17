import { Router } from 'express';
import { planService } from '../services/planService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const plans = await planService.findAll();
    res.json(plans);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      minDeposit,
      maxDeposit,
      maxAccounts,
      profitSharingCustomer,
      profitSharingPlatform,
      upfrontFee,
      visability,
      confirmationText,
    } = req.body;

    const plan = await planService.create({
      name,
      minDeposit,
      maxDeposit,
      maxAccounts,
      profitSharingCustomer,
      profitSharingPlatform,
      upfrontFee,
      visability,
      confirmationText,
    });

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
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
      visability,
      confirmationText,
    } = req.body;

    const plan = await planService.update(id, {
      name,
      minDeposit,
      maxDeposit,
      maxAccounts,
      profitSharingCustomer,
      profitSharingPlatform,
      upfrontFee,
      visability,
      confirmationText,
    });

    res.json(plan);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await planService.delete(id);
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router; 