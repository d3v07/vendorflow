import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Tenant, User, Vendor, Contract, Invoice } from '../src/models';
import { hashPassword } from '../src/utils/password';
import {
  VendorCategory,
  VendorStatus,
  ContractStatus,
  InvoiceStatus,
  VENDOR_CATEGORIES,
} from '../src/types';

// Seed configuration
const VENDOR_COUNT = 200;
const CONTRACT_COUNT = 500;
const INVOICE_COUNT = 2000;

// Helper functions
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date): Date =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Data generators
const companyPrefixes = [
  'Global', 'Premier', 'Elite', 'Dynamic', 'Strategic', 'Innovative', 'Advanced',
  'Prime', 'Core', 'Next', 'Alpha', 'Beta', 'Omega', 'Summit', 'Peak', 'Apex',
  'Horizon', 'Vertex', 'Quantum', 'Nova',
];

const companySuffixes = [
  'Solutions', 'Systems', 'Group', 'Partners', 'Technologies', 'Services', 'Labs',
  'Corp', 'Inc', 'Associates', 'Consulting', 'Enterprises', 'Holdings', 'Ventures',
  'Networks', 'International',
];

const companyMids = [
  'Tech', 'Data', 'Cloud', 'Digital', 'Smart', 'Cyber', 'Net', 'Info', 'Logic',
  'Link', 'Soft', 'Web', 'App', 'Code', 'Dev', 'Secure', 'Pro', 'Edge', 'Flow',
];

const firstNames = [
  'James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley',
  'William', 'Amanda', 'John', 'Jennifer', 'Richard', 'Elizabeth', 'Thomas',
  'Maria', 'Christopher', 'Linda', 'Daniel', 'Susan', 'Matthew', 'Karen',
  'Anthony', 'Nancy', 'Mark', 'Lisa', 'Donald', 'Betty', 'Steven', 'Helen',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
];

const cities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'Austin', 'San Francisco', 'Seattle',
  'Denver', 'Boston', 'Atlanta', 'Miami', 'Portland', 'Las Vegas', 'Detroit',
  'Minneapolis',
];

const states = [
  'NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'TX', 'CA', 'WA',
  'CO', 'MA', 'GA', 'FL', 'OR', 'NV', 'MI', 'MN',
];

const contractTypes = [
  'Annual Service Agreement',
  'Software License',
  'Maintenance Contract',
  'Consulting Engagement',
  'Support Agreement',
  'SaaS Subscription',
  'Professional Services',
  'Master Service Agreement',
  'Managed Services Contract',
  'Development Agreement',
  'Implementation Services',
  'Training Services Agreement',
];

const generateCompanyName = (): string => {
  return `${randomElement(companyPrefixes)} ${randomElement(companyMids)} ${randomElement(companySuffixes)}`;
};

const generateName = (): string => {
  return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
};

const generateEmail = (name: string, company: string): string => {
  const cleanName = name.toLowerCase().replace(' ', '.');
  const cleanCompany = company.toLowerCase().replace(/\s+/g, '').substring(0, 10);
  return `${cleanName}@${cleanCompany}.com`;
};

const generatePhone = (): string => {
  return `+1 (${randomNumber(200, 999)}) ${randomNumber(200, 999)}-${randomNumber(1000, 9999)}`;
};

const generateAddress = (): string => {
  const cityIdx = randomNumber(0, cities.length - 1);
  const streets = ['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Park', 'Lake', 'Hill', 'River'];
  const streetTypes = ['Street', 'Avenue', 'Boulevard', 'Drive', 'Way', 'Lane'];
  return `${randomNumber(100, 9999)} ${randomElement(streets)} ${randomElement(streetTypes)}, ${cities[cityIdx]}, ${states[cityIdx]} ${randomNumber(10000, 99999)}`;
};

const computeContractStatus = (startDate: Date, endDate: Date): ContractStatus => {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (endDate < now) {
    return 'expired';
  } else if (endDate <= thirtyDaysFromNow) {
    return 'expiring_soon';
  }
  return 'active';
};

const computeInvoiceStatus = (dueDate: Date, isPaid: boolean): InvoiceStatus => {
  if (isPaid) return 'paid';
  const now = new Date();
  if (dueDate < now) return 'overdue';
  return 'pending';
};

async function seed(): Promise<void> {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorflow';
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Vendor.deleteMany({}),
      Contract.deleteMany({}),
      Invoice.deleteMany({}),
    ]);
    console.log('Existing data cleared');

    // Create tenant
    console.log('Creating tenant...');
    const tenant = await Tenant.create({
      name: 'VendorFlow Demo',
      slug: 'vendorflow-demo',
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        invoicePrefix: 'INV',
        invoiceNextNumber: 1,
      },
      isActive: true,
    });
    console.log(`Tenant created: ${tenant.name} (${tenant._id})`);

    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await hashPassword('password123');
    const adminUser = await User.create({
      tenantId: tenant._id,
      email: 'admin@vendorflow.test',
      password: hashedPassword,
      name: 'Alex Thompson',
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin user created: ${adminUser.email}`);

    // Create additional users
    console.log('Creating additional users...');
    await User.create([
      {
        tenantId: tenant._id,
        email: 'manager@vendorflow.test',
        password: hashedPassword,
        name: 'Sarah Chen',
        role: 'manager',
        isActive: true,
      },
      {
        tenantId: tenant._id,
        email: 'viewer@vendorflow.test',
        password: hashedPassword,
        name: 'John Mitchell',
        role: 'viewer',
        isActive: true,
      },
    ]);
    console.log('Additional users created');

    // Create vendors
    console.log(`Creating ${VENDOR_COUNT} vendors...`);
    const vendorStatuses: VendorStatus[] = ['active', 'active', 'active', 'inactive', 'pending'];
    const vendors: any[] = [];

    for (let i = 0; i < VENDOR_COUNT; i++) {
      const companyName = generateCompanyName();
      const contactName = generateName();

      vendors.push({
        tenantId: tenant._id,
        companyName,
        category: randomElement(VENDOR_CATEGORIES),
        contactName,
        contactEmail: generateEmail(contactName, companyName),
        contactPhone: generatePhone(),
        address: generateAddress(),
        status: randomElement(vendorStatuses),
        notes: Math.random() > 0.7 ? `Notes for ${companyName}` : undefined,
        createdAt: randomDate(new Date('2022-01-01'), new Date('2024-06-01')),
        updatedAt: randomDate(new Date('2024-01-01'), new Date()),
      });
    }

    const createdVendors = await Vendor.insertMany(vendors);
    console.log(`${createdVendors.length} vendors created`);

    // Create contracts
    console.log(`Creating ${CONTRACT_COUNT} contracts...`);
    const contracts: any[] = [];

    for (let i = 0; i < CONTRACT_COUNT; i++) {
      const vendor = randomElement(createdVendors);
      const startDate = randomDate(new Date('2023-01-01'), new Date('2024-06-01'));
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + randomNumber(6, 36));

      const status = computeContractStatus(startDate, endDate);

      contracts.push({
        tenantId: tenant._id,
        vendorId: vendor._id,
        title: randomElement(contractTypes),
        description: `Contract for ${vendor.category.toLowerCase()} services with ${vendor.companyName}`,
        startDate,
        endDate,
        value: randomNumber(10000, 250000),
        autoRenew: Math.random() > 0.4,
        status,
        createdAt: startDate,
        updatedAt: randomDate(startDate, new Date()),
      });
    }

    const createdContracts = await Contract.insertMany(contracts);
    console.log(`${createdContracts.length} contracts created`);

    // Create invoices
    console.log(`Creating ${INVOICE_COUNT} invoices...`);
    const invoices: any[] = [];
    let invoiceCounter = 0;

    for (let i = 0; i < INVOICE_COUNT; i++) {
      const contract = randomElement(createdContracts);
      const vendor = createdVendors.find(
        (v) => v._id.toString() === contract.vendorId.toString()
      );

      if (!vendor) continue;

      invoiceCounter++;
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${String(invoiceCounter).padStart(4, '0')}`;

      const createdAt = randomDate(contract.startDate, new Date());
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 30);

      const today = new Date();
      const isPastDue = dueDate < today;
      const isPaid = isPastDue ? Math.random() > 0.25 : Math.random() > 0.5;
      const status = computeInvoiceStatus(dueDate, isPaid);

      invoices.push({
        tenantId: tenant._id,
        vendorId: vendor._id,
        contractId: contract._id,
        invoiceNumber,
        amount: Math.round(contract.value / randomNumber(4, 12) * (0.8 + Math.random() * 0.4)),
        dueDate,
        paidDate: status === 'paid' ? randomDate(createdAt, dueDate) : undefined,
        status,
        description: `Payment for ${contract.title}`,
        createdAt,
        updatedAt: status === 'paid' ? randomDate(createdAt, new Date()) : createdAt,
      });
    }

    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`${createdInvoices.length} invoices created`);

    // Update tenant invoice number
    await Tenant.findByIdAndUpdate(tenant._id, {
      'settings.invoiceNextNumber': invoiceCounter + 1,
    });

    // Summary
    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================');
    console.log(`Tenant: ${tenant.name}`);
    console.log(`Users: 3`);
    console.log(`Vendors: ${createdVendors.length}`);
    console.log(`Contracts: ${createdContracts.length}`);
    console.log(`Invoices: ${createdInvoices.length}`);
    console.log('========================================');
    console.log('Login credentials:');
    console.log('  Admin: admin@vendorflow.test / password123');
    console.log('  Manager: manager@vendorflow.test / password123');
    console.log('  Viewer: viewer@vendorflow.test / password123');
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
