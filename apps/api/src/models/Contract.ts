import mongoose, { Schema, Document, Model } from 'mongoose';
import { IContract, ContractStatus, CONTRACT_STATUSES } from '../types';

export interface ContractDocument extends Omit<IContract, '_id'>, Document {}

const contractSchema = new Schema<ContractDocument>(
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
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    value: {
      type: Number,
      required: [true, 'Contract value is required'],
      min: [0, 'Value cannot be negative'],
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: CONTRACT_STATUSES,
      default: 'draft',
    },
    documents: [{
      type: String,
    }],
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
contractSchema.index({ tenantId: 1, status: 1 });
contractSchema.index({ tenantId: 1, endDate: 1 });
contractSchema.index({ tenantId: 1, vendorId: 1 });
contractSchema.index({ tenantId: 1, status: 1, endDate: 1 });
contractSchema.index({ tenantId: 1, createdAt: -1 });

// Virtual for vendor
contractSchema.virtual('vendor', {
  ref: 'Vendor',
  localField: 'vendorId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to compute status from dates
contractSchema.pre('save', function (next) {
  if (this.status !== 'draft') {
    const now = new Date();
    const endDate = new Date(this.endDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (endDate < now) {
      this.status = 'expired';
    } else if (endDate <= thirtyDaysFromNow) {
      this.status = 'expiring_soon';
    } else {
      this.status = 'active';
    }
  }
  next();
});

// Validate that endDate is after startDate
contractSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

// Static method to compute status
export const computeContractStatus = (startDate: Date, endDate: Date): ContractStatus => {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (endDate < now) {
    return 'expired';
  } else if (endDate <= thirtyDaysFromNow) {
    return 'expiring_soon';
  } else if (startDate > now) {
    return 'draft';
  }
  return 'active';
};

export const Contract: Model<ContractDocument> = mongoose.model<ContractDocument>('Contract', contractSchema);
export default Contract;
