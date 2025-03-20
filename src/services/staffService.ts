import { PrismaClient } from '@prisma/client';
import { Staff, StaffRole, StaffStatus } from '../types';

const prisma = new PrismaClient();

// Define the permission structure mirroring the frontend
export interface Permission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface ModulePermissions {
  users: Permission;
  accounts: Permission;
  pnl: Permission;
  wallets: Permission;
  transactions: Permission;
  chat: Permission;
  agents: Permission;
  plans: Permission;
  [key: string]: Permission;
}

const DEFAULT_PERMISSIONS: ModulePermissions = {
  users: { view: true, edit: false, delete: false },
  accounts: { view: true, edit: false, delete: false },
  pnl: { view: true, edit: false, delete: false },
  wallets: { view: true, edit: false, delete: false },
  transactions: { view: true, edit: false, delete: false },
  chat: { view: true, edit: false, delete: false },
  agents: { view: true, edit: false, delete: false },
  plans: { view: true, edit: false, delete: false }
};

// Generate default permissions based on role
const generateDefaultPermissions = (role: StaffRole): ModulePermissions => {
  // Base permissions that everyone gets
  const basePermissions: ModulePermissions = {
    users: { view: true, edit: false, delete: false },
    accounts: { view: true, edit: false, delete: false },
    pnl: { view: true, edit: false, delete: false },
    wallets: { view: true, edit: false, delete: false },
    transactions: { view: true, edit: false, delete: false },
    chat: { view: true, edit: false, delete: false },
    agents: { view: true, edit: false, delete: false },
    plans: { view: true, edit: false, delete: false }
  };
  
  // Role-specific permissions
  switch(role) {
    case StaffRole.ADMIN:
      // Admin gets all permissions
      return {
        users: { view: true, edit: true, delete: true },
        accounts: { view: true, edit: true, delete: true },
        pnl: { view: true, edit: true, delete: true },
        wallets: { view: true, edit: true, delete: true },
        transactions: { view: true, edit: true, delete: true },
        chat: { view: true, edit: true, delete: true },
        agents: { view: true, edit: true, delete: true },
        plans: { view: true, edit: true, delete: true }
      };
    case StaffRole.CTO:
      // CTO gets technical permissions
      return {
        ...basePermissions,
        accounts: { view: true, edit: true, delete: true },
        pnl: { view: true, edit: true, delete: false }
      };
    case StaffRole.COO:
      // COO gets operational permissions
      return {
        ...basePermissions,
        users: { view: true, edit: true, delete: false },
        wallets: { view: true, edit: true, delete: false },
        transactions: { view: true, edit: true, delete: false }
      };
    case StaffRole.CMO:
      // CMO gets marketing permissions
      return {
        ...basePermissions,
        agents: { view: true, edit: true, delete: false },
        chat: { view: true, edit: true, delete: true }
      };
    case StaffRole.CAO:
      // CAO gets advisor permissions
      return {
        ...basePermissions,
        accounts: { view: true, edit: true, delete: false },
        plans: { view: true, edit: true, delete: false }
      };
    case StaffRole.MANAGER:
      // Manager gets limited edit permissions
      return {
        ...basePermissions,
        users: { view: true, edit: true, delete: false },
        accounts: { view: true, edit: true, delete: false }
      };
    case StaffRole.SUPPORT:
      // Support gets view permissions plus chat edit
      return {
        ...basePermissions,
        chat: { view: true, edit: true, delete: false }
      };
    default:
      return basePermissions;
  }
};

// Generate portal name based on role
const generatePortalName = (role: StaffRole): string => {
  switch(role) {
    case StaffRole.ADMIN:
      return 'Admin Portal';
    case StaffRole.MANAGER:
      return 'Manager Portal';
    case StaffRole.SUPPORT:
      return 'Support Portal';
    case StaffRole.COO:
      return 'COO Portal';
    case StaffRole.CTO:
      return 'CTO Portal';
    case StaffRole.CMO:
      return 'CMO Portal';
    case StaffRole.CAO:
      return 'CAO Portal';
    default:
      return `${role} Portal`;
  }
};

// Custom type for staff with permissions as object
interface StaffWithParsedPermissions extends Omit<Staff, 'permissions'> {
  permissions: ModulePermissions;
}

export const staffService = {
  async findAll(): Promise<StaffWithParsedPermissions[]> {
    const staffMembers = await prisma.staff.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Parse the permissions JSON for each staff member
    return staffMembers.map(staff => ({
      ...staff,
      permissions: JSON.parse(staff.permissions as string)
    })) as StaffWithParsedPermissions[];
  },

  async findById(id: string): Promise<StaffWithParsedPermissions | null> {
    const staff = await prisma.staff.findUnique({
      where: { id },
    });
    
    if (staff) {
      return {
        ...staff,
        permissions: JSON.parse(staff.permissions as string)
      } as StaffWithParsedPermissions;
    }
    
    return null;
  },

  async findByEmail(email: string): Promise<StaffWithParsedPermissions | null> {
    const staff = await prisma.staff.findUnique({
      where: { email },
    });
    
    if (staff) {
      return {
        ...staff,
        permissions: JSON.parse(staff.permissions as string)
      } as StaffWithParsedPermissions;
    }
    
    return null;
  },

  async create(data: {
    email: string;
    name: string;
    role: StaffRole;
    status: StaffStatus;
    portalName?: string;
  }): Promise<StaffWithParsedPermissions> {
    // Generate portal name based on role if not provided
    const portalName = data.portalName || generatePortalName(data.role);
    
    // Generate default permissions based on role
    const permissions = generateDefaultPermissions(data.role);

    const staff = await prisma.staff.create({
      data: {
        id: `S${Math.floor(1000 + Math.random() * 9000)}`,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        permissions: JSON.stringify(permissions),
        portalName,
      },
    });
    
    return {
      ...staff,
      permissions
    } as StaffWithParsedPermissions;
  },

  async update(id: string, data: Partial<Staff>): Promise<StaffWithParsedPermissions> {
    const updateData: any = { ...data };
    
    // If updating permissions, stringify them if they're not already a string
    if (data.permissions && typeof data.permissions !== 'string') {
      updateData.permissions = JSON.stringify(data.permissions);
    }

    // If role is changing but portalName isn't provided, update the portalName
    if (data.role && !data.portalName) {
      updateData.portalName = generatePortalName(data.role as StaffRole);
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData,
    });
    
    return {
      ...staff,
      permissions: JSON.parse(staff.permissions as string)
    } as StaffWithParsedPermissions;
  },

  async updateStatus(id: string, status: StaffStatus): Promise<StaffWithParsedPermissions> {
    const staff = await prisma.staff.update({
      where: { id },
      data: { status },
    });
    
    return {
      ...staff,
      permissions: JSON.parse(staff.permissions as string)
    } as StaffWithParsedPermissions;
  },

  async updateRole(id: string, role: StaffRole): Promise<StaffWithParsedPermissions> {
    // Generate new permissions based on the new role
    const permissions = generateDefaultPermissions(role);
    
    const staff = await prisma.staff.update({
      where: { id },
      data: { 
        role,
        permissions: JSON.stringify(permissions),
        portalName: generatePortalName(role)
      },
    });
    
    return {
      ...staff,
      permissions
    } as StaffWithParsedPermissions;
  },

  async delete(id: string) {
    return prisma.staff.delete({
      where: { id },
    });

  },
}; 