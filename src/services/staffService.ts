import { PrismaClient } from '@prisma/client';
import { Staff, StaffRole, StaffStatus } from '../types';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  users: ['read'],
  accounts: ['read'],
  transactions: ['read'],
};

// Generate portal name based on role
const generatePortalName = (role: StaffRole): string => {
  switch(role) {
    case 'ADMIN':
      return 'Admin Portal';
    case 'MANAGER':
      return 'Manager Portal';
    case 'SUPPORT':
      return 'Support Portal';
    case 'COO':
      return 'COO Portal';
    case 'CTO':
      return 'CTO Portal';
    case 'CMO':
      return 'CMO Portal';
    case 'CAO':
      return 'CAO Portal';
    default:
      return `${role} Portal`;
  }
};

export const staffService = {
  async findAll() {
    return prisma.staff.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findById(id: string) {
    return prisma.staff.findUnique({
      where: { id },
    });
  },

  async findByEmail(email: string) {
    return prisma.staff.findUnique({
      where: { email },
    });
  },

  async create(data: {
    email: string;
    name: string;
    role: StaffRole;
    portalName?: string;
  }) {
    // Generate portal name based on role if not provided
    const portalName = data.portalName || generatePortalName(data.role);

    return prisma.staff.create({
      data: {
        id: `S${Math.floor(1000 + Math.random() * 9000)}`,
        email: data.email,
        name: data.name,
        role: data.role,
        status: StaffStatus.ACTIVE,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS),
        portalName,
      } as any, // Type assertion to bypass type checking
    });
  },

  async update(id: string, data: Partial<Staff>) {
    const updateData: any = { ...data };
    
    // If updating permissions, stringify them if they're not already a string
    if (data.permissions && typeof data.permissions !== 'string') {
      updateData.permissions = JSON.stringify(data.permissions);
    }

    // If role is changing but portalName isn't provided, update the portalName
    if (data.role && !data.portalName) {
      updateData.portalName = generatePortalName(data.role as StaffRole);
    }

    return prisma.staff.update({
      where: { id },
      data: updateData,
    });
  },

  async updateStatus(id: string, status: StaffStatus) {
    return prisma.staff.update({
      where: { id },
      data: { status },
    });
  },

  async updateRole(id: string, role: StaffRole) {
    return prisma.staff.update({
      where: { id },
      data: { role },
    });
  },

  async delete(id: string) {
    return prisma.staff.delete({
      where: { id },
    });
  },
}; 