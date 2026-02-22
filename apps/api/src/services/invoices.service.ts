import mongoose from 'mongoose';
import { Invoice, Vendor, Contract, Tenant } from '../models';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CreateInvoiceInput, UpdateInvoiceInput, GetInvoicesQuery, MarkAsPaidInput } from '../validators/invoices.validator';
import { parsePaginationQuery, createPaginationMeta, buildSortObject } from '../utils/pagination';
import { PaginationMeta, InvoiceStatus } from '../types';
import { publishInvoicePdfJob } from '../jobs/publisher';
import logger from '../utils/logger';

interface InvoiceListResult {
  invoices: any[];
  meta: PaginationMeta;
}

export class InvoicesService {
  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const tenant = await Tenant.findById(tenantId);
    const prefix = tenant?.settings?.invoicePrefix || 'INV';
    const year = new Date().getFullYear();

    const count = await Invoice.countDocuments({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      invoiceNumber: { $regex: `^${prefix}-${year}-` },
    });

    const nextNumber = (count + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${nextNumber}`;
  }

  /**
   * Compute invoice status based on dates
   */
  private computeStatus(dueDate: Date, paidDate?: Date, currentStatus?: InvoiceStatus): InvoiceStatus {
    if (paidDate || currentStatus === 'paid') {
      return 'paid';
    }

    if (currentStatus === 'draft') {
      return 'draft';
    }

    const now = new Date();
    if (dueDate < now) {
      return 'overdue';
    }

    return 'pending';
  }

  /**
   * Get all invoices for a tenant with pagination and filtering
   */
  async getInvoices(tenantId: string, query: GetInvoicesQuery): Promise<InvoiceListResult> {
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(query);

    // Build filter
    const filter: Record<string, any> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.vendorId) {
      filter.vendorId = new mongoose.Types.ObjectId(query.vendorId);
    }

    if (query.contractId) {
      filter.contractId = new mongoose.Types.ObjectId(query.contractId);
    }

    if (query.search) {
      filter.$or = [
        { invoiceNumber: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.dueDateFrom || query.dueDateTo) {
      filter.dueDate = {};
      if (query.dueDateFrom) filter.dueDate.$gte = new Date(query.dueDateFrom);
      if (query.dueDateTo) filter.dueDate.$lte = new Date(query.dueDateTo);
    }

    if (query.paidDateFrom || query.paidDateTo) {
      filter.paidDate = {};
      if (query.paidDateFrom) filter.paidDate.$gte = new Date(query.paidDateFrom);
      if (query.paidDateTo) filter.paidDate.$lte = new Date(query.paidDateTo);
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      filter.amount = {};
      if (query.minAmount !== undefined) filter.amount.$gte = query.minAmount;
      if (query.maxAmount !== undefined) filter.amount.$lte = query.maxAmount;
    }

    // Execute query with vendor lookup
    const [invoices, total] = await Promise.all([
      Invoice.aggregate([
        { $match: filter },
        { $sort: buildSortObject(sortBy, sortOrder) },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'contracts',
            localField: 'contractId',
            foreignField: '_id',
            as: 'contract',
          },
        },
        { $unwind: { path: '$contract', preserveNullAndEmptyArrays: true } },
      ]),
      Invoice.countDocuments(filter),
    ]);

    return {
      invoices: invoices.map((i) => ({
        id: i._id.toString(),
        invoiceNumber: i.invoiceNumber,
        vendorId: i.vendorId.toString(),
        vendorName: i.vendor?.companyName || 'Unknown',
        contractId: i.contractId?.toString(),
        contractTitle: i.contract?.title,
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

  /**
   * Get a single invoice by ID
   */
  async getInvoiceById(tenantId: string, invoiceId: string) {
    const [invoice] = await Invoice.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(invoiceId),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        },
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'contracts',
          localField: 'contractId',
          foreignField: '_id',
          as: 'contract',
        },
      },
      { $unwind: { path: '$contract', preserveNullAndEmptyArrays: true } },
    ]);

    if (!invoice) {
      throw new NotFoundError('Invoice');
    }

    return {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      vendorId: invoice.vendorId.toString(),
      vendorName: invoice.vendor?.companyName || 'Unknown',
      contractId: invoice.contractId?.toString(),
      contractTitle: invoice.contract?.title,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      status: invoice.status,
      description: invoice.description,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Create a new invoice
   */
  async createInvoice(tenantId: string, data: CreateInvoiceInput) {
    // Check idempotency key
    if (data.idempotencyKey) {
      const existing = await Invoice.findOne({ idempotencyKey: data.idempotencyKey });
      if (existing) {
        return this.getInvoiceById(tenantId, existing._id.toString());
      }
    }

    // Verify vendor exists
    const vendor = await Vendor.findOne({
      _id: data.vendorId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!vendor) {
      throw new BadRequestError('Invalid vendor ID');
    }

    // Verify contract exists if provided
    if (data.contractId) {
      const contract = await Contract.findOne({
        _id: data.contractId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        vendorId: data.vendorId,
      });

      if (!contract) {
        throw new BadRequestError('Invalid contract ID or contract does not belong to this vendor');
      }
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    // Compute status
    const status = this.computeStatus(new Date(data.dueDate), undefined, data.status as InvoiceStatus | undefined);

    const invoice = await Invoice.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      vendorId: new mongoose.Types.ObjectId(data.vendorId),
      contractId: data.contractId ? new mongoose.Types.ObjectId(data.contractId) : undefined,
      invoiceNumber,
      amount: data.amount,
      dueDate: data.dueDate,
      status,
      description: data.description,
      idempotencyKey: data.idempotencyKey,
    });

    // Trigger PDF generation job (async, non-blocking)
    try {
      const jobId = await publishInvoicePdfJob(
        tenantId,
        invoice._id.toString(),
        `invoice-pdf-${invoice._id}`
      );
      logger.info(`PDF generation job queued for invoice ${invoice.invoiceNumber}`, { jobId });
    } catch (jobError) {
      // Log but don't fail the request - PDF can be regenerated later
      logger.warn(`Failed to queue PDF job for invoice ${invoice.invoiceNumber}:`, jobError);
    }

    return {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      vendorId: invoice.vendorId.toString(),
      vendorName: vendor.companyName,
      contractId: invoice.contractId?.toString(),
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      status: invoice.status,
      description: invoice.description,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Update an invoice
   */
  async updateInvoice(tenantId: string, invoiceId: string, data: UpdateInvoiceInput) {
    const currentInvoice = await Invoice.findOne({
      _id: invoiceId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!currentInvoice) {
      throw new NotFoundError('Invoice');
    }

    // Verify vendor if being updated
    if (data.vendorId) {
      const vendor = await Vendor.findOne({
        _id: data.vendorId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      });

      if (!vendor) {
        throw new BadRequestError('Invalid vendor ID');
      }
    }

    // Verify contract if being updated
    if (data.contractId) {
      const vendorId = data.vendorId || currentInvoice.vendorId;
      const contract = await Contract.findOne({
        _id: data.contractId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        vendorId,
      });

      if (!contract) {
        throw new BadRequestError('Invalid contract ID or contract does not belong to this vendor');
      }
    }

    // Compute new status if needed
    const dueDate = data.dueDate ? new Date(data.dueDate) : currentInvoice.dueDate;
    const status = (data.status as InvoiceStatus | undefined) || this.computeStatus(dueDate, currentInvoice.paidDate || undefined, data.status as InvoiceStatus | undefined);

    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: invoiceId,
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      {
        $set: {
          ...data,
          status,
        },
      },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      throw new NotFoundError('Invoice');
    }

    return this.getInvoiceById(tenantId, invoiceId);
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(tenantId: string, invoiceId: string): Promise<void> {
    const result = await Invoice.deleteOne({
      _id: invoiceId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Invoice');
    }
  }

  /**
   * Mark an invoice as paid
   */
  async markAsPaid(tenantId: string, invoiceId: string, data: MarkAsPaidInput) {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!invoice) {
      throw new NotFoundError('Invoice');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestError('Invoice is already paid');
    }

    invoice.status = 'paid';
    invoice.paidDate = data.paidDate ? new Date(data.paidDate) : new Date();
    await invoice.save();

    return this.getInvoiceById(tenantId, invoiceId);
  }

  /**
   * Update invoice statuses based on dates (can be run periodically)
   */
  async updateInvoiceStatuses(tenantId: string): Promise<number> {
    const now = new Date();

    // Update overdue invoices
    const result = await Invoice.updateMany(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        status: 'pending',
        dueDate: { $lt: now },
      },
      { $set: { status: 'overdue' } }
    );

    return result.modifiedCount;
  }
}

export const invoicesService = new InvoicesService();
export default invoicesService;
