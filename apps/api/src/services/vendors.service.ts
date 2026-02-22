import mongoose from 'mongoose';
import { Vendor, Contract, Invoice } from '../models';
import { NotFoundError, ConflictError } from '../utils/errors';
import { CreateVendorInput, UpdateVendorInput, GetVendorsQuery } from '../validators/vendors.validator';
import { parsePaginationQuery, createPaginationMeta, buildSortObject } from '../utils/pagination';
import { PaginationMeta } from '../types';

interface VendorListResult {
  vendors: any[];
  meta: PaginationMeta;
}

interface VendorWithStats {
  id: string;
  companyName: string;
  category: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  totalSpend: number;
  contractCount: number;
}

export class VendorsService {
  /**
   * Get all vendors for a tenant with pagination and filtering
   */
  async getVendors(tenantId: string, query: GetVendorsQuery): Promise<VendorListResult> {
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(query);

    // Build filter
    const filter: Record<string, any> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.search) {
      filter.$or = [
        { companyName: { $regex: query.search, $options: 'i' } },
        { contactName: { $regex: query.search, $options: 'i' } },
        { contactEmail: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Execute query with aggregation for computed fields
    const [vendors, total] = await Promise.all([
      Vendor.aggregate([
        { $match: filter },
        { $sort: buildSortObject(sortBy, sortOrder) },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'contracts',
            localField: '_id',
            foreignField: 'vendorId',
            as: 'contracts',
          },
        },
        {
          $lookup: {
            from: 'invoices',
            let: { vendorId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$vendorId', '$$vendorId'] },
                      { $eq: ['$status', 'paid'] },
                    ],
                  },
                },
              },
            ],
            as: 'paidInvoices',
          },
        },
        {
          $addFields: {
            totalSpend: { $sum: '$paidInvoices.amount' },
            contractCount: { $size: '$contracts' },
          },
        },
        {
          $project: {
            contracts: 0,
            paidInvoices: 0,
          },
        },
      ]),
      Vendor.countDocuments(filter),
    ]);

    return {
      vendors: vendors.map((v) => ({
        id: v._id.toString(),
        companyName: v.companyName,
        category: v.category,
        contactName: v.contactName,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone,
        address: v.address,
        status: v.status,
        notes: v.notes,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        totalSpend: v.totalSpend || 0,
        contractCount: v.contractCount || 0,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single vendor by ID with computed stats
   */
  async getVendorById(tenantId: string, vendorId: string): Promise<VendorWithStats> {
    const [vendor] = await Vendor.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(vendorId),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        },
      },
      {
        $lookup: {
          from: 'contracts',
          localField: '_id',
          foreignField: 'vendorId',
          as: 'contracts',
        },
      },
      {
        $lookup: {
          from: 'invoices',
          let: { vendorId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$vendorId', '$$vendorId'] },
                    { $eq: ['$status', 'paid'] },
                  ],
                },
              },
            },
          ],
          as: 'paidInvoices',
        },
      },
      {
        $addFields: {
          totalSpend: { $sum: '$paidInvoices.amount' },
          contractCount: { $size: '$contracts' },
        },
      },
      {
        $project: {
          contracts: 0,
          paidInvoices: 0,
        },
      },
    ]);

    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

    return {
      id: vendor._id.toString(),
      companyName: vendor.companyName,
      category: vendor.category,
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      address: vendor.address,
      status: vendor.status,
      notes: vendor.notes,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      totalSpend: vendor.totalSpend || 0,
      contractCount: vendor.contractCount || 0,
    };
  }

  /**
   * Create a new vendor
   */
  async createVendor(tenantId: string, data: CreateVendorInput): Promise<VendorWithStats> {
    const vendor = await Vendor.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ...data,
    });

    return {
      id: vendor._id.toString(),
      companyName: vendor.companyName,
      category: vendor.category,
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      address: vendor.address,
      status: vendor.status,
      notes: vendor.notes,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      totalSpend: 0,
      contractCount: 0,
    };
  }

  /**
   * Update a vendor
   */
  async updateVendor(
    tenantId: string,
    vendorId: string,
    data: UpdateVendorInput
  ): Promise<VendorWithStats> {
    const vendor = await Vendor.findOneAndUpdate(
      {
        _id: vendorId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

    // Get updated vendor with stats
    return this.getVendorById(tenantId, vendorId);
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(tenantId: string, vendorId: string): Promise<void> {
    // Check if vendor has contracts or invoices
    const [contractCount, invoiceCount] = await Promise.all([
      Contract.countDocuments({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
      }),
      Invoice.countDocuments({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
      }),
    ]);

    if (contractCount > 0 || invoiceCount > 0) {
      throw new ConflictError(
        'Cannot delete vendor with existing contracts or invoices. Deactivate instead.'
      );
    }

    const result = await Vendor.deleteOne({
      _id: vendorId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Vendor');
    }
  }

  /**
   * Get contracts for a vendor
   */
  async getVendorContracts(tenantId: string, vendorId: string, query: any) {
    // First verify vendor exists
    const vendor = await Vendor.findOne({
      _id: vendorId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(query);

    const filter = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      vendorId: new mongoose.Types.ObjectId(vendorId),
    };

    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .sort(buildSortObject(sortBy, sortOrder))
        .skip(skip)
        .limit(limit)
        .lean(),
      Contract.countDocuments(filter),
    ]);

    return {
      contracts: contracts.map((c) => ({
        id: c._id.toString(),
        vendorId: c.vendorId.toString(),
        vendorName: vendor.companyName,
        title: c.title,
        description: c.description,
        startDate: c.startDate,
        endDate: c.endDate,
        value: c.value,
        autoRenew: c.autoRenew,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get invoices for a vendor
   */
  async getVendorInvoices(tenantId: string, vendorId: string, query: any) {
    // First verify vendor exists
    const vendor = await Vendor.findOne({
      _id: vendorId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(query);

    const filter = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      vendorId: new mongoose.Types.ObjectId(vendorId),
    };

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort(buildSortObject(sortBy, sortOrder))
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return {
      invoices: invoices.map((i) => ({
        id: i._id.toString(),
        invoiceNumber: i.invoiceNumber,
        vendorId: i.vendorId.toString(),
        vendorName: vendor.companyName,
        contractId: i.contractId?.toString(),
        amount: i.amount,
        dueDate: i.dueDate,
        paidDate: i.paidDate,
        status: i.status,
        description: i.description,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }
}

export const vendorsService = new VendorsService();
export default vendorsService;
