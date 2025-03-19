import { Router } from "express";
import { staffService } from "../services/staffService";
import { AppError } from "../middleware/errorHandler";
import { StaffRole, StaffStatus, UserRole } from "../types";
import {
  checkViewPermission,
  checkEditPermission,
  checkDeletePermission,
} from "../middleware/checkPermissions";
import { userService } from "../services/userService";
import { User } from "@prisma/client";

const router = Router();

// Helper function to validate and normalize role
const validateAndNormalizeRole = (role: string): StaffRole => {
  const normalizedRole = role.toUpperCase();
  if (!Object.values(StaffRole).includes(normalizedRole as StaffRole)) {
    throw new AppError("Invalid staff role", 400);
  }
  return normalizedRole as StaffRole;
};

// Get all staff members - requires 'staff' view permission
router.get("/", checkViewPermission("staff"), async (req, res, next) => {
  try {
    const staff = await staffService.findAll();
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Create a new staff member - requires 'staff' edit permission
router.post("/", checkEditPermission("staff"), async (req, res, next) => {
  try {
    const { email, name, role } = req.body;

    // Validate and normalize role
    const normalizedRole = validateAndNormalizeRole(role);

    const existingStaff = await staffService.findByEmail(email);
    if (existingStaff) {
      throw new AppError("Staff member with this email already exists", 400);
    }

    const staff = await staffService.create({
      email,
      name,
      role: normalizedRole,
    });
    const user = (await userService.findByEmail(email)) as User;

    if (user?.uniqueId) {
      await userService.updateRole(
        user.uniqueId,
        normalizedRole as unknown as UserRole
      );
    }

    res.status(201).json(staff);
  } catch (error) {
    next(error);
  }
});

// Get a specific staff member - requires 'staff' view permission
router.get("/:id", checkViewPermission("staff"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await staffService.findById(id);

    if (!staff) {
      throw new AppError("Staff member not found", 404);
    }

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Update a staff member - requires 'staff' edit permission
router.patch("/:id", checkEditPermission("staff"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, name, role, permissions, status } = req.body;

    // If updating email, check if it's already taken
    if (email) {
      const existingStaff = await staffService.findByEmail(email);
      if (existingStaff && existingStaff.id !== id) {
        throw new AppError("Email already in use", 400);
      }
    }

    // If updating role, validate and normalize it
    const normalizedRole = role ? validateAndNormalizeRole(role) : undefined;

    // If updating status, validate and normalize it
    let normalizedStatus = status;
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!Object.values(StaffStatus).includes(upperStatus as StaffStatus)) {
        throw new AppError("Invalid staff status", 400);
      }
      normalizedStatus = upperStatus;
    }

    // If updating permissions, validate them
    if (permissions) {
      try {
        if (typeof permissions === "string") {
          JSON.parse(permissions);
        }
      } catch (e) {
        throw new AppError("Invalid permissions format", 400);
      }
    }

    const staff = await staffService.update(id, {
      ...(email && { email }),
      ...(name && { name }),
      ...(normalizedRole && { role: normalizedRole }),
      ...(normalizedStatus && { status: normalizedStatus as StaffStatus }),
      ...(permissions && { permissions }),
    });

    const user = (await userService.findByEmail(staff.email)) as User;

    if (normalizedRole && user.uniqueId) {
      await userService.updateRole(
        user.uniqueId,
        normalizedRole as unknown as UserRole
      );
    }

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Update a staff member's status - requires 'staff' edit permission
router.patch(
  "/:id/status",
  checkEditPermission("staff"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const upperStatus = status.toUpperCase();
      if (!Object.values(StaffStatus).includes(upperStatus as StaffStatus)) {
        throw new AppError("Invalid staff status", 400);
      }

      const staff = await staffService.updateStatus(
        id,
        upperStatus as StaffStatus
      );
      res.json(staff);
    } catch (error) {
      next(error);
    }
  }
);

// Update a staff member's role - requires 'staff' edit permission
router.patch(
  "/:id/role",
  checkEditPermission("staff"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const normalizedRole = validateAndNormalizeRole(role);

      const staff = await staffService.updateRole(id, normalizedRole);
      res.json(staff);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a staff member - requires 'staff' delete permission
router.delete(
  "/:id",
  checkDeletePermission("staff"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const staff = await staffService.findById(id);
      if (!staff) {
        throw new AppError("Staff member not found", 404);
      }
      const user = (await userService.findByEmail(staff.email)) as User;
      await staffService.delete(id);
      await userService.updateRole(user.uniqueId, "CUSTOMER" as UserRole);

      res.json({ message: "Staff member deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
