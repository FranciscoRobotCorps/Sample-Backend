import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './errors';

// Define types for our JWT payload and user
export interface JwtPayload {
  userId: number;
  email: string;
}

// Create a secret key - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'hermes_jwt_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'hermes_refresh_token_secret_key';

/**
 * Generate access token
 */
export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' } // 7 days
  );
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Access token required');
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpError(401, 'Invalid token');
    }
    throw error;
  }
}

/**
 * Middleware to authenticate and authorize requests using JWT
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Access token required');
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpError(401, 'Invalid token');
    }
    throw error;
  }
}