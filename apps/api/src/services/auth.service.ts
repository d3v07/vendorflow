import mongoose from 'mongoose';
import { Tenant, User, RefreshToken } from '../models';
import { generateAccessToken, generateRefreshToken, verifyToken, getTokenExpiration } from '../utils/jwt';
import { comparePassword } from '../utils/password';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';
import config from '../config';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { JwtPayload } from '../types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    tenantName: string;
  };
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Register a new tenant with an admin user
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Generate tenant slug
    const slug = data.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if tenant slug exists
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      throw new ConflictError('Organization name already taken');
    }

    // Create tenant
    const tenant = await Tenant.create({
      name: data.tenantName,
      slug,
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        invoicePrefix: 'INV',
        invoiceNextNumber: 1,
      },
    });

    // Create admin user
    const user = await User.create({
      tenantId: tenant._id,
      email: data.email,
      password: data.password,
      name: data.name,
      role: 'admin',
      isActive: true,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user._id, tenant._id, user.role);

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant._id.toString(),
        tenantName: tenant.name,
      },
      tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    // Find user with password
    const user = await User.findOne({ email: data.email })
      .select('+password')
      .populate('tenantId', 'name');

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await comparePassword(data.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tenant = user.tenantId as any;
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedError('Organization is deactivated');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user._id,
      tenant._id,
      user.role
    );

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant._id.toString(),
        tenantName: tenant.name,
      },
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify token
    let payload: JwtPayload;
    try {
      payload = verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      userId: payload.userId,
    });

    if (!storedToken) {
      throw new UnauthorizedError('Refresh token not found or revoked');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Verify user still exists and is active
    const user = await User.findOne({
      _id: payload.userId,
      tenantId: payload.tenantId,
      isActive: true,
    });

    if (!user) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('User not found or inactive');
    }

    // Delete old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    // Generate new tokens
    return this.generateTokens(
      new mongoose.Types.ObjectId(payload.userId),
      new mongoose.Types.ObjectId(payload.tenantId),
      payload.role
    );
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string, tenantId: string) {
    const user = await User.findOne({
      _id: userId,
      tenantId,
      isActive: true,
    }).populate('tenantId', 'name settings');

    if (!user) {
      throw new NotFoundError('User');
    }

    const tenant = user.tenantId as any;

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      tenantId: tenant._id.toString(),
      tenantName: tenant.name,
      tenantSettings: tenant.settings,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: mongoose.Types.ObjectId,
    tenantId: mongoose.Types.ObjectId,
    role: string
  ): Promise<AuthTokens> {
    const payload = {
      userId: userId.toString(),
      tenantId: tenantId.toString(),
      role: role as any,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    const expiresAt = getTokenExpiration(config.jwt.refreshExpiresIn);
    await RefreshToken.create({
      userId,
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
export default authService;
