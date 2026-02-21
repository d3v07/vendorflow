import mongoose, { Schema, Document, Model } from 'mongoose';
import { IInvoice, INVOICE_STATUSES } from '../types';

export interface InvoiceDocument extends Omit<IInvoice, '_id'>, Document {}

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      default: undefined,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      maxlength: [50, 'Invoice number cannot exceed 50 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    paidDate: {
      type: Date,
      default: undefined,
    },
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: 'draft',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    pdfUrl: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for tenant isolation and common queries
invoiceSchema.index({ tenantId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ tenantId: 1, vendorId: 1 });
invoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, paidDate: 1 });
invoiceSchema.index({ tenantId: 1, createdAt: -1 });
invoiceSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true });

// Virtual for vendor
invoiceSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendorId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for contract
invoiceSchema.virtual('contract', {
  ref: 'Contract',
  localField: 'contractId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to update status based on dates
invoiceSchema.pre('save', function (next) {
  // If paid, keep as paid
  if (this.status === 'paid' || this.paidDate) {
    this.status = 'paid';
    return next();
  }

  // If draft, keep as draft
  if (this.status === 'draft') {
    return next();
  }

  // Check if overdue
  const now = new Date();
  if (this.dueDate < now) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }

  next();
});

// Static method to generate invoice number
export const generateInvoiceNumber = async (
  tenantId: mongoose.Types.ObjectId,
  prefix: string = 'INV'
): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    tenantId,
    invoiceNumber: { $regex: `^${prefix}-${year}-` },
  });
  const nextNumber = (count + 1).toString().padStart(4, '0');
  return `${prefix}-${year}-${nextNumber}`;
};

export const Invoice: Model<InvoiceDocument> = mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);
export default Invoice;
