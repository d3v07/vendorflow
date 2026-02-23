import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import config from '../config';
import { JwtPayload } from '../types';

export const generateAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret as Secret, options);
};

export const generateRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret as Secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret as Secret) as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiration = (expiresIn: string): Date => {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('Invalid expiration format');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
  }

  return now;
};
