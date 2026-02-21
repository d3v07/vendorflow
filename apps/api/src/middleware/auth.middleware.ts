import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { User } from '../models';
import { JwtPayload } from '../types';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Verify user still exists and is active
    const user = await User.findOne({
      _id: payload.userId,
      tenantId: payload.tenantId,
      isActive: true,
    }).select('email name role');

    if (!user) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Attach user info to request
    req.userId = payload.userId;
    req.tenantId = payload.tenantId;
    req.userRole = payload.role;
    req.user = {
      id: user._id.toString(),
      tenantId: payload.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const payload = verifyToken(token);

      const user = await User.findOne({
        _id: payload.userId,
        tenantId: payload.tenantId,
        isActive: true,
      }).select('email name role');

      if (user) {
        req.userId = payload.userId;
        req.tenantId = payload.tenantId;
        req.userRole = payload.role;
        req.user = {
          id: user._id.toString(),
          tenantId: payload.tenantId,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    } catch {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
