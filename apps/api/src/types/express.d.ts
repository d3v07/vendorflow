import { Types } from 'mongoose';
import { UserRole } from './index';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      userRole?: UserRole;
      user?: {
        id: string;
        tenantId: string;
        email: string;
        name: string;
        role: UserRole;
      };
    }
  }
}

export {};
