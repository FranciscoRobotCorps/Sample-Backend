import bcrypt from 'bcrypt';
import { Router } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errors';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';

interface DbUser extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
}

const router = Router();

// Login endpoint - returns access and refresh tokens
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  // Query database for user by email
  const [rows] = await getPool().execute<DbUser[]>(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
    [email],
  );
  const user = rows[0];

  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  // Verify password against stored bcrypt hash
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new HttpError(401, 'Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email,
    },
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
    const decoded = jwt.verify(
      refresh_token,
      process.env.REFRESH_TOKEN_SECRET || 'hermes_refresh_token_secret_key',
    ) as { userId: number; email: string };

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId, decoded.email);

    res.json({
      access_token: newAccessToken,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpError(401, 'Invalid or expired refresh token');
    }
    throw error;
  }
}));

// Logout endpoint (optional - for revoking refresh tokens)
router.post('/logout', asyncHandler(async (_req, res) => {
  // In a real app, you would invalidate the refresh token in Redis or database
  // For this example, we'll just return success
  res.json({ message: 'Logged out successfully' });
}));

export default router;