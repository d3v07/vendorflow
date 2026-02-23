// VendorFlow Types

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

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

export interface Vendor {
  id: string;
  companyName: string;
  category: VendorCategory;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: VendorStatus;
  createdAt: Date;
  updatedAt: Date;
  totalSpend: number;
  contractCount: number;
}

export type ContractStatus = 'active' | 'expiring_soon' | 'expired' | 'draft';

export interface Contract {
  id: string;
  vendorId: string;
  vendorName: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  value: number;
  autoRenew: boolean;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  contractId?: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: InvoiceStatus;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

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
