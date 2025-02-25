import { Router } from 'express';
import { referralService } from '../services/referralService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const referrals = await referralService.findAll();
    res.json(referrals);
  } catch (error) {
    next(error);
  }
});

router.get('/agent/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const referrals = await referralService.findByAgentId(agentId);
    res.json(referrals);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { agentId, customerId, isManualAssignment } = req.body;
    const referral = await referralService.create({
      agentUniqueId: agentId,
      customerUniqueId: customerId,
      isManualAssignment,
    });
    res.status(201).json(referral);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/activate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const referral = await referralService.activate(id);
    res.json(referral);
  } catch (error) {
    next(error);
  }
});

export default router; 