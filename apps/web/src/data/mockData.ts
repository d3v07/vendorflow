import { 
  User, 
  Vendor, 
  Contract, 
  Invoice, 
  VendorCategory, 
  VendorStatus, 
  ContractStatus, 
  InvoiceStatus,
  DashboardStats,
  SpendByCategory,
  MonthlySpend
} from '@/types';

// Helper functions
const generateId = () => Math.random().toString(36).substring(2, 11);

const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Categories
const vendorCategories: VendorCategory[] = [
  'Technology', 'Marketing', 'Legal', 'Finance', 'HR Services', 'Facilities', 'Consulting', 'Logistics'
];

// Company name generators
const companyPrefixes = ['Global', 'Premier', 'Elite', 'Dynamic', 'Strategic', 'Innovative', 'Advanced', 'Prime', 'Core', 'Next'];
const companySuffixes = ['Solutions', 'Systems', 'Group', 'Partners', 'Technologies', 'Services', 'Labs', 'Corp', 'Inc', 'Associates'];
const companyMids = ['Tech', 'Data', 'Cloud', 'Digital', 'Smart', 'Cyber', 'Net', 'Info', 'Logic', 'Link'];

const generateCompanyName = () => {
  return `${randomElement(companyPrefixes)} ${randomElement(companyMids)} ${randomElement(companySuffixes)}`;
};

const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'William', 'Amanda', 'John', 'Jennifer', 'Richard', 'Elizabeth', 'Thomas', 'Maria', 'Christopher', 'Linda', 'Daniel', 'Susan'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White'];

const generateName = () => `${randomElement(firstNames)} ${randomElement(lastNames)}`;

const generateEmail = (name: string, company: string) => {
  const cleanName = name.toLowerCase().replace(' ', '.');
  const cleanCompany = company.toLowerCase().replace(/\s+/g, '').substring(0, 10);
  return `${cleanName}@${cleanCompany}.com`;
};

const generatePhone = () => `+1 (${randomNumber(200, 999)}) ${randomNumber(200, 999)}-${randomNumber(1000, 9999)}`;

const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin', 'San Francisco', 'Seattle', 'Denver', 'Boston', 'Atlanta'];
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'TX', 'CA', 'WA', 'CO', 'MA', 'GA'];

const generateAddress = () => {
  const cityIdx = randomNumber(0, cities.length - 1);
  return `${randomNumber(100, 9999)} ${randomElement(['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Park', 'Lake', 'Hill', 'River'])} ${randomElement(['Street', 'Avenue', 'Boulevard', 'Drive', 'Way', 'Lane'])}, ${cities[cityIdx]}, ${states[cityIdx]} ${randomNumber(10000, 99999)}`;
};

// Generate Users
export const mockUsers: User[] = [
  {
    id: 'usr_admin_001',
    email: 'admin@vendorflow.com',
    name: 'Alex Thompson',
    role: 'admin',
    avatar: undefined,
    createdAt: new Date('2023-01-15'),
    lastLogin: new Date(),
    isActive: true
  },
  {
    id: 'usr_manager_001',
    email: 'sarah.manager@vendorflow.com',
    name: 'Sarah Chen',
    role: 'manager',
    avatar: undefined,
    createdAt: new Date('2023-03-20'),
    lastLogin: new Date(Date.now() - 86400000),
    isActive: true
  },
  {
    id: 'usr_viewer_001',
    email: 'john.viewer@vendorflow.com',
    name: 'John Mitchell',
    role: 'viewer',
    avatar: undefined,
    createdAt: new Date('2023-06-10'),
    lastLogin: new Date(Date.now() - 172800000),
    isActive: true
  },
  {
    id: 'usr_manager_002',
    email: 'emily.manager@vendorflow.com',
    name: 'Emily Rodriguez',
    role: 'manager',
    avatar: undefined,
    createdAt: new Date('2023-08-05'),
    lastLogin: new Date(Date.now() - 3600000),
    isActive: true
  },
  {
    id: 'usr_viewer_002',
    email: 'david.viewer@vendorflow.com',
    name: 'David Kim',
    role: 'viewer',
    avatar: undefined,
    createdAt: new Date('2024-01-12'),
    lastLogin: undefined,
    isActive: false
  }
];

// Generate Vendors
export const mockVendors: Vendor[] = Array.from({ length: 50 }, (_, i) => {
  const companyName = generateCompanyName();
  const contactName = generateName();
  const statuses: VendorStatus[] = ['active', 'active', 'active', 'inactive', 'pending'];
  
  return {
    id: `vnd_${generateId()}`,
    companyName,
    category: randomElement(vendorCategories),
    contactName,
    contactEmail: generateEmail(contactName, companyName),
    contactPhone: generatePhone(),
    address: generateAddress(),
    status: randomElement(statuses),
    createdAt: randomDate(new Date('2022-01-01'), new Date('2024-06-01')),
    updatedAt: randomDate(new Date('2024-01-01'), new Date()),
    totalSpend: randomNumber(5000, 500000),
    contractCount: randomNumber(1, 8)
  };
});

// Generate Contracts
export const mockContracts: Contract[] = mockVendors.flatMap((vendor) => {
  const contractCount = randomNumber(1, 4);
  return Array.from({ length: contractCount }, () => {
    const startDate = randomDate(new Date('2023-01-01'), new Date('2024-06-01'));
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + randomNumber(6, 36));
    
    const today = new Date();
    const daysUntilEnd = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: ContractStatus;
    if (daysUntilEnd < 0) {
      status = 'expired';
    } else if (daysUntilEnd <= 30) {
      status = 'expiring_soon';
    } else {
      status = 'active';
    }
    
    const contractTypes = [
      'Annual Service Agreement',
      'Software License',
      'Maintenance Contract',
      'Consulting Engagement',
      'Support Agreement',
      'SaaS Subscription',
      'Professional Services',
      'Master Service Agreement'
    ];
    
    return {
      id: `cnt_${generateId()}`,
      vendorId: vendor.id,
      vendorName: vendor.companyName,
      title: randomElement(contractTypes),
      description: `Contract for ${vendor.category.toLowerCase()} services with ${vendor.companyName}`,
      startDate,
      endDate,
      value: randomNumber(10000, 250000),
      autoRenew: Math.random() > 0.4,
      status,
      createdAt: startDate,
      updatedAt: randomDate(startDate, new Date())
    };
  });
});

// Generate Invoices
export const mockInvoices: Invoice[] = mockContracts.flatMap((contract) => {
  const invoiceCount = randomNumber(2, 8);
  return Array.from({ length: invoiceCount }, (_, i) => {
    const createdAt = randomDate(contract.startDate, new Date());
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const today = new Date();
    const isPastDue = dueDate < today;
    const statusOptions: InvoiceStatus[] = isPastDue 
      ? ['paid', 'paid', 'paid', 'overdue'] 
      : ['paid', 'paid', 'pending'];
    
    const status = randomElement(statusOptions);
    
    return {
      id: `inv_${generateId()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(randomNumber(1000, 9999)).padStart(4, '0')}`,
      vendorId: contract.vendorId,
      vendorName: contract.vendorName,
      contractId: contract.id,
      amount: Math.round(contract.value / invoiceCount * (0.8 + Math.random() * 0.4)),
      dueDate,
      paidDate: status === 'paid' ? randomDate(createdAt, dueDate) : undefined,
      status,
      description: `Payment for ${contract.title}`,
      createdAt,
      updatedAt: status === 'paid' ? randomDate(createdAt, new Date()) : createdAt
    };
  });
});

// Dashboard Stats
export const getDashboardStats = (): DashboardStats => {
  const activeVendors = mockVendors.filter(v => v.status === 'active').length;
  const activeContracts = mockContracts.filter(c => c.status === 'active' || c.status === 'expiring_soon').length;
  const unpaidInvoices = mockInvoices.filter(i => i.status === 'pending' || i.status === 'overdue').length;
  
  const thisMonth = new Date();
  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const monthlySpend = mockInvoices
    .filter(i => i.status === 'paid' && i.paidDate && i.paidDate.getMonth() === thisMonth.getMonth())
    .reduce((sum, i) => sum + i.amount, 0);
  
  return {
    totalVendors: activeVendors,
    activeContracts,
    unpaidInvoices,
    monthlySpend,
    vendorsTrend: 12,
    contractsTrend: 8,
    invoicesTrend: -5,
    spendTrend: 15
  };
};

// Spend by Category
export const getSpendByCategory = (): SpendByCategory[] => {
  const spendMap = new Map<VendorCategory, number>();
  
  mockInvoices
    .filter(i => i.status === 'paid')
    .forEach(invoice => {
      const vendor = mockVendors.find(v => v.id === invoice.vendorId);
      if (vendor) {
        const current = spendMap.get(vendor.category) || 0;
        spendMap.set(vendor.category, current + invoice.amount);
      }
    });
  
  const total = Array.from(spendMap.values()).reduce((a, b) => a + b, 0);
  
  return Array.from(spendMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / total) * 100)
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Monthly Spend Trend
export const getMonthlySpend = (): MonthlySpend[] => {
  const months: MonthlySpend[] = [];
  const today = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    
    const monthInvoices = mockInvoices.filter(inv => {
      if (inv.status !== 'paid' || !inv.paidDate) return false;
      return inv.paidDate.getMonth() === date.getMonth() && 
             inv.paidDate.getFullYear() === date.getFullYear();
    });
    
    months.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      amount: monthInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      invoiceCount: monthInvoices.length
    });
  }
  
  return months;
};

// Upcoming Renewals
export const getUpcomingRenewals = () => {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 60);
  
  return mockContracts
    .filter(c => c.endDate >= today && c.endDate <= thirtyDaysFromNow)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 5);
};

// Unpaid Invoices (for dashboard widget)
export const getUnpaidInvoices = () => {
  return mockInvoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);
};

// Current user context (simulated)
export const currentUser = mockUsers[0]; // Admin by default
