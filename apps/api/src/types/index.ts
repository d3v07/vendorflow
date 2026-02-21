import { Types } from 'mongoose';

// User roles with hierarchy
export type UserRole = 'admin' | 'manager' | 'viewer';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
};

// Vendor types
export type VendorCategory =
  | 'Technology'
  | 'Marketing'
  | 'Legal'
  | 'Finance'
  | 'HR Services'
  | 'Facilities'
  | 'Consulting'
  | 'Logistics';

export type VendorStatus = 'active' | 'inactive' | 'pending';

// Contract types
export type ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'draft';

// Invoice types
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';

// Document interfaces (for Mongoose)
export type SubscriptionTier = 'free' | 'starter' | 'pro';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';

export interface ITenant {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  settings: {
    currency: string;
    timezone: string;
    dateFormat: string;
    invoicePrefix: string;
    invoiceNextNumber: number;
  };
  isActive: boolean;
  // Stripe billing fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendor {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  companyName: string;
  category: VendorCategory;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: VendorStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContract {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  vendorId: Types.ObjectId;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  value: number;
  autoRenew: boolean;
  status: ContractStatus;
  documents?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  vendorId: Types.ObjectId;
  contractId?: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: InvoiceStatus;
  description: string;
  idempotencyKey?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// JWT payload
export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Dashboard types
export interface DashboardStats {
  totalVendors: number;
  activeContracts: number;
  unpaidInvoices: number;
  monthlySpend: number;
  vendorsTrend: number;
  contractsTrend: number;
  invoicesTrend: number;
  spendTrend: number;
}

export interface SpendByCategory {
  category: VendorCategory;
  amount: number;
  percentage: number;
}

export interface MonthlySpend {
  month: string;
  amount: number;
  invoiceCount: number;
}

// Vendor categories constant array
export const VENDOR_CATEGORIES: VendorCategory[] = [
  'Technology',
  'Marketing',
  'Legal',
  'Finance',
  'HR Services',
  'Facilities',
  'Consulting',
  'Logistics',
];

export const VENDOR_STATUSES: VendorStatus[] = ['active', 'inactive', 'pending'];
export const CONTRACT_STATUSES: ContractStatus[] = ['active', 'expiring_soon', 'expired', 'draft'];
export const INVOICE_STATUSES: InvoiceStatus[] = ['paid', 'pending', 'overdue', 'draft'];
