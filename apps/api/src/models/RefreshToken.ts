import mongoose, { Schema, Document, Model } from 'mongoose';
import { IRefreshToken } from '../types';

export interface RefreshTokenDocument extends Omit<IRefreshToken, '_id'>, Document {}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to clean up expired tokens
refreshTokenSchema.statics.cleanupExpired = async function (): Promise<number> {
  const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
  return result.deletedCount;
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function (
  userId: mongoose.Types.ObjectId
): Promise<number> {
  const result = await this.deleteMany({ userId });
  return result.deletedCount;
};

export const RefreshToken: Model<RefreshTokenDocument> = mongoose.model<RefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema
);
export default RefreshToken;
