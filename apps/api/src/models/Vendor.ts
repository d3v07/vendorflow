import mongoose, { Schema, Document, Model } from 'mongoose';
import { IVendor, VENDOR_CATEGORIES, VENDOR_STATUSES } from '../types';

export interface VendorDocument extends Omit<IVendor, '_id'>, Document {}

const vendorSchema = new Schema<VendorDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: VENDOR_CATEGORIES,
      required: [true, 'Category is required'],
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      maxlength: [255, 'Contact email cannot exceed 255 characters'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      maxlength: [30, 'Contact phone cannot exceed 30 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: VENDOR_STATUSES,
      default: 'pending',
    },
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
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
vendorSchema.index({ tenantId: 1, status: 1 });
vendorSchema.index({ tenantId: 1, category: 1 });
vendorSchema.index({ tenantId: 1, companyName: 'text' });
vendorSchema.index({ tenantId: 1, createdAt: -1 });

export const Vendor: Model<VendorDocument> = mongoose.model<VendorDocument>('Vendor', vendorSchema);
export default Vendor;
