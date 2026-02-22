import mongoose from 'mongoose';
import { User, RefreshToken } from '../models';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { CreateUserInput, UpdateUserInput, GetUsersQuery } from '../validators/users.validator';
import { parsePaginationQuery, createPaginationMeta, buildSortObject } from '../utils/pagination';
import { PaginationMeta } from '../types';

interface UserListResult {
  users: any[];
  meta: PaginationMeta;
}

export class UsersService {
  /**
   * Get all users for a tenant with pagination and filtering
   */
  async getUsers(tenantId: string, query: GetUsersQuery): Promise<UserListResult> {
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationQuery(query);

    // Build filter
    const filter: Record<string, any> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };

    if (query.role) {
      filter.role = query.role;
    }

    if (typeof query.isActive === 'boolean') {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Execute query
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(buildSortObject(sortBy, sortOrder))
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      meta: createPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get a single user by ID
   */
  async getUserById(tenantId: string, userId: string) {
    const user = await User.findOne({
      _id: userId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).lean();

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create a new user
   */
  async createUser(tenantId: string, data: CreateUserInput) {
    // Check if email already exists in tenant
    const existingUser = await User.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      email: data.email,
    });

    if (existingUser) {
      throw new ConflictError('Email already exists in this organization');
    }

    const user = await User.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ...data,
    });

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update a user
   */
  async updateUser(tenantId: string, userId: string, data: UpdateUserInput) {
    // Check if user exists
    const existingUser = await User.findOne({
      _id: userId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // If email is being changed, check for conflicts
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await User.findOne({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        email: data.email,
        _id: { $ne: userId },
      });

      if (emailExists) {
        throw new ConflictError('Email already exists in this organization');
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Delete a user
   */
  async deleteUser(tenantId: string, userId: string, currentUserId: string): Promise<void> {
    // Prevent self-deletion
    if (userId === currentUserId) {
      throw new BadRequestError('Cannot delete your own account');
    }

    const user = await User.findOne({
      _id: userId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Delete user and their refresh tokens
    await Promise.all([
      User.deleteOne({ _id: userId }),
      RefreshToken.deleteMany({ userId }),
    ]);
  }

  /**
   * Toggle user active status
   */
  async toggleUserActive(tenantId: string, userId: string, currentUserId: string) {
    // Prevent self-deactivation
    if (userId === currentUserId) {
      throw new BadRequestError('Cannot deactivate your own account');
    }

    const user = await User.findOne({
      _id: userId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    user.isActive = !user.isActive;
    await user.save();

    // If deactivating, revoke all refresh tokens
    if (!user.isActive) {
      await RefreshToken.deleteMany({ userId });
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const usersService = new UsersService();
export default usersService;
