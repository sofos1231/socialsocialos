// backend/src/modules/auth/admin.guard.ts
// Step 1: Prototype admin guard - any valid JWT = admin
// TODO: Replace with role-based admin check later

import { Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  // For Step 1: Simply enforce JWT authentication
  // Any valid JWT is treated as admin access
  // TODO: Add role-based check (e.g., check user.role === 'admin' or user.isAdmin === true)
  // TODO: This will require:
  //  1. User model/table to have role/isAdmin field
  //  2. JWT payload to include role/admin flag
  //  3. This guard to check req.user.role or req.user.isAdmin
}


