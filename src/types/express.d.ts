import { JwtPayload } from '../middleware/auth';

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}