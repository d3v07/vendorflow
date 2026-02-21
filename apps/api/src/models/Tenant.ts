import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITenant } from '../types';

export interface TenantDocument extends Omit<ITenant, '_id'>, Document {}

const tenantSchema = new Schema<TenantDocument>(
  {
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Tenant slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [50, 'Slug cannot exceed 50 characters'],
    },
    settings: {
      currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      },
      timezone: {
        type: String,
        default: 'America/New_York',
      },
      dateFormat: {
        type: String,
        default: 'MM/DD/YYYY',
        enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      },
      invoicePrefix: {
        type: String,
        default: 'INV',
        maxlength: [10, 'Invoice prefix cannot exceed 10 characters'],
      },
      invoiceNextNumber: {
        type: Number,
        default: 1,
        min: 1,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stripe billing fields
    stripeCustomerId: {
      type: String,
      sparse: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'starter', 'pro'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing'],
      default: 'active',
    },
    trialEndsAt: {
      type: Date,
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

// Indexes
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ isActive: 1 });

// Pre-save hook to generate slug
tenantSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

export const Tenant: Model<TenantDocument> = mongoose.model<TenantDocument>('Tenant', tenantSchema);
export default Tenant;
