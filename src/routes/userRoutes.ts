import { Router } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, email, phoneCode, phone, status } = req.body;
    const user = await userService.create({
      username,
      email,
      phoneCode,
      phone,
      status,
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.findById(id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = await userService.updateStatus(id, status);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await userService.updateRole(id, role);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.update(id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.delete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router; 