import { PrismaClient } from '@prisma/client';
import { Staff, StaffRole, StaffStatus } from '../types';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  users: ['read'],
  accounts: ['read'],
  transactions: ['read'],
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
  }) {
    return prisma.staff.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        status: StaffStatus.ACTIVE,
        permissions: JSON.stringify(DEFAULT_PERMISSIONS),
      },
    });
  },

  async update(id: string, data: Partial<Staff>) {
    const updateData: any = { ...data };
    
    // If updating permissions, stringify them if they're not already a string
    if (data.permissions && typeof data.permissions !== 'string') {
      updateData.permissions = JSON.stringify(data.permissions);
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