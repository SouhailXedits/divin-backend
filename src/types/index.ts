export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER'
}

export enum StaffRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SUPPORT = 'SUPPORT',
  COO = 'COO',
  CTO = 'CTO',
  CMO = 'CMO',
  CAO = 'CAO'
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PROFIT_SHARE = 'PROFIT_SHARE'
}

export interface User {
  id: string;
  uniqueId: string;
  username: string;
  email: string;
  phoneCode: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  accountNo: string;
  server: string;
  password: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  minDeposit: number;
  maxDeposit: number;
  maxAccounts: number;
  profitSharingCustomer: number;
  profitSharingPlatform: number;
  upfrontFee: number;
  confirmationText?: string;
  createdAt: Date;
  updatedAt: Date;
  visability: 'PUBLIC' | 'PRIVATE';
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: Date;
}

export interface Referral {
  id: string;
  agentId: string;
  customerId: string;
  isManualAssignment: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PnL {
  id: string;
  userIds: string[];
  date: Date;
  symbol: string;
  totalPnL: number;
  customerShare: number;
  divineAlgoShare: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: string | Record<string, string[]>;
  portalName: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
} 