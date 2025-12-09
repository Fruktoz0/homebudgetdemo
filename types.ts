export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Currency {
  HUF = 'HUF',
  EUR = 'EUR',
  USD = 'USD'
}

export interface User {
  id: string;
  email: string;
  password?: string;
  displayName: string;
  householdId: string | null;
  membershipStatus?: 'APPROVED' | 'PENDING'; // New field for approval workflow
}

export interface Invitation {
  id: string;
  householdId: string;
  email: string;
  code: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  createdAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string; // The user who manages the household
  currency: Currency;
  members: User[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  createdBy: string; // User ID
  isRecurringInstance: boolean;
  recurringItemId?: string; // Links this specific payment to the recurring rule
  deletedAt?: string | null; // Soft delete support
}

export interface RecurringItem {
  id: string;
  householdId: string;
  type: TransactionType;
  name: string;
  amount: number;
  category: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  active: boolean;
  autoPay?: boolean; // If true, system automatically creates transaction when due
  payDay?: number; // Day of the month (1-31) for auto-payment trigger
}

export interface SavingGoal {
  id: string;
  householdId: string;
  name: string;
  currentAmount: number;
  targetAmount?: number; // Optional goal
  color?: string; // For UI visualization
  deletedAt?: string | null;
}

export interface SavingLog {
  id: string;
  savingGoalId: string;
  amount: number; // Positive for deposit, negative for withdrawal
  date: string;
  description?: string;
}

export interface AuditLog {
  id: string;
  actionType: string;
  originalData: string; // JSON string
  performedByUserId: string;
  timestamp: string;
  householdId: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}