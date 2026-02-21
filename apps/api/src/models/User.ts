import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, UserRole } from '../types';
import { hashPassword } from '../utils/password';

export interface UserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'viewer'] as UserRole[],
      default: 'viewer',
    },
    avatar: {
      type: String,
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
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
        delete ret.password;
        return ret;
      },
    },
  }
);

// Compound indexes for tenant isolation
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, isActive: 1 });
userSchema.index({ tenantId: 1, role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await hashPassword(this.password);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

export const User: Model<UserDocument> = mongoose.model<UserDocument>('User', userSchema);
export default User;
