import { Router } from 'express';
import { staffService } from '../services/staffService';
import { AppError } from '../middleware/errorHandler';
import { StaffRole, StaffStatus } from '../types';

const router = Router();

// Helper function to validate and normalize role
const validateAndNormalizeRole = (role: string): StaffRole => {
  const normalizedRole = role.toUpperCase();
  console.log(normalizedRole);
  if (!Object.values(StaffRole).includes(normalizedRole as StaffRole)) {
    throw new AppError('Invalid staff role', 400);
  }
  return normalizedRole as StaffRole;
};

router.get('/', async (req, res, next) => {
  try {
    const staff = await staffService.findAll();
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, name, role } = req.body;

    // Validate and normalize role
    const normalizedRole = validateAndNormalizeRole(role);

    const existingStaff = await staffService.findByEmail(email);
    if (existingStaff) {
      throw new AppError('Staff member with this email already exists', 400);
    }

    const staff = await staffService.create({
      email,
      name,
      role: normalizedRole,
    });

    res.status(201).json(staff);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await staffService.findById(id);

    if (!staff) {
      throw new AppError('Staff member not found', 404);
    }

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, role, permissions, status } = req.body;

    // If updating email, check if it's already taken
    if (email) {
      const existingStaff = await staffService.findByEmail(email);
      if (existingStaff && existingStaff.id !== id) {
        throw new AppError('Email already in use', 400);
      }
    }

    // If updating role, validate and normalize it
    const normalizedRole = role ? validateAndNormalizeRole(role) : undefined;

    // If updating status, validate and normalize it
    let normalizedStatus = status;
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!Object.values(StaffStatus).includes(upperStatus as StaffStatus)) {
        throw new AppError('Invalid staff status', 400);
      }
      normalizedStatus = upperStatus;
    }

    // If updating permissions, validate them
    if (permissions) {
      try {
        if (typeof permissions === 'string') {
          JSON.parse(permissions);
        }
      } catch (e) {
        throw new AppError('Invalid permissions format', 400);
      }
    }

    const staff = await staffService.update(id, {
      ...(email && { email }),
      ...(name && { name }),
      ...(normalizedRole && { role: normalizedRole }),
      ...(normalizedStatus && { status: normalizedStatus as StaffStatus }),
      ...(permissions && { permissions }),
    });

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const upperStatus = status.toUpperCase();
    if (!Object.values(StaffStatus).includes(upperStatus as StaffStatus)) {
      throw new AppError('Invalid staff status', 400);
    }

    const staff = await staffService.updateStatus(id, upperStatus as StaffStatus);
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const normalizedRole = validateAndNormalizeRole(role);

    const staff = await staffService.updateRole(id, normalizedRole);
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await staffService.delete(id);
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router; 