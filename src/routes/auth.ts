import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errors';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';

// In a real application, you'd have proper user validation with password hashing
// For this example, we'll simulate authentication with a hardcoded user

export interface User {
  id: number;
  email: string;
  passwordHash?: string;
}

const router = Router();

// Mock user data - in a real app this would come from the database
const mockUsers: User[] = [
  {
    id: 1,
    email: 'user@example.com',
    passwordHash: '$2b$10$...' // This would be a hashed password in production
  }
];

// Login endpoint - returns access and refresh tokens
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  // Find user in mock data
  const user = mockUsers.find(u => u.email === email);
  
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  // In a real app, you would verify the password hash here
  // if (!bcrypt.compareSync(password, user.passwordHash)) {
  //   throw new HttpError(401, 'Invalid credentials');
  // }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email
    }
  });
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body as { refresh_token: string };

  if (!refresh_token) {
    throw new HttpError(400, 'Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET || 'hermes_refresh_token_secret_key') as { userId: number; email: string };
    
    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId, decoded.email);

    res.json({
      access_token: newAccessToken
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpError(401, 'Invalid refresh token');
    }
    throw error;
  }
}));

// Logout endpoint (optional - for revoking refresh tokens)
router.post('/logout', asyncHandler(async (req, res) => {
  // In a real app, you would invalidate the refresh token in Redis or database
  // For this example, we'll just return success
  res.json({ message: 'Logged out successfully' });
}));

export default router;