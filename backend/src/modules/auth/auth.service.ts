import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../db/prisma.service';
import * as bcrypt from 'bcryptjs';
import { addDays, isBefore } from 'date-fns';
import { ConfigService } from '@nestjs/config';

const ISSUER_FALLBACK = undefined as unknown as string; // force config usage
const AUDIENCE_FALLBACK = undefined as unknown as string;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async issue(userId: string, email?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true, email: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const iss = this.config.get<string>('JWT_ISS') ?? ISSUER_FALLBACK;
    const aud = this.config.get<string>('JWT_AUD') ?? AUDIENCE_FALLBACK;

    if (!iss || !aud) {
      throw new UnauthorizedException({
        code: 'AUTH_CONFIG_INVALID',
        message: 'JWT issuer/audience not configured',
      });
    }

    const accessToken = await this.jwt.signAsync(
      { sub: userId, sv: user.sessionVersion, email: email || user.email },
      { issuer: iss, audience: aud },
    );

    // Try to create a refresh token, but DO NOT break login/signup if it fails
    let rawRefresh: string | undefined;

    try {
      rawRefresh = `${userId}.${cryptoRandom(36)}`;
      const tokenHash = await bcrypt.hash(rawRefresh, 10);

      await this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: addDays(new Date(), 30),
        },
      });
    } catch (err) {
      // Important: log but don't kill the request. Access token is enough for now.
      console.error('🔥 ISSUE refreshToken error:', err);
      rawRefresh = undefined;
    }

    return {
      ok: true,
      user: {
        id: userId,
        email: email || user.email,
        createdAt: user.createdAt,
      },
      accessToken,
      ...(rawRefresh ? { refreshToken: rawRefresh } : {}),
    };
  }

  // Overloads to satisfy any stale type references expecting a single-arg login
  async login(email: string): Promise<any>;
  async login(email: string, password?: string): Promise<any>;
  async login(email: string, password?: string) {
    try {
      const normEmail = (email || '').trim().toLowerCase();
      if (!normEmail) {
        throw new UnauthorizedException({
          code: 'AUTH_INVALID',
          message: 'Invalid email or password',
        });
      }

      const user = await this.prisma.user.findUnique({
        where: { email: normEmail },
        select: { id: true, email: true, createdAt: true, passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedException({
          code: 'AUTH_INVALID',
          message: 'Invalid email or password',
        });
      }

      const ok = await bcrypt.compare(password || '', user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException({
          code: 'AUTH_INVALID',
          message: 'Invalid email or password',
        });
      }

      return this.issue(user.id, user.email);
    } catch (err) {
      console.error('🔥 LOGIN ERROR:', err);
      throw err;
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    return { ok: true };
  }

  async verify(token: string) {
    try {
      const iss = this.config.get<string>('JWT_ISS') ?? ISSUER_FALLBACK;
      const aud = this.config.get<string>('JWT_AUD') ?? AUDIENCE_FALLBACK;

      const payload = await this.jwt.verifyAsync(token, { issuer: iss, audience: aud });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { sessionVersion: true },
      });

      if (!user || user.sessionVersion !== payload.sv) {
        throw new UnauthorizedException({
          code: 'AUTH_SESSION_REVOKED',
          message: 'Session revoked',
        });
      }

      return payload as { sub: string; sv: number };
    } catch (e) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
      });
    }
  }

  async signup(email: string, password: string, name?: string) {
    try {
      const normEmail = (email || '').trim().toLowerCase();

      const existing = await this.prisma.user.findUnique({
        where: { email: normEmail },
      });

      if (existing) {
        throw new ConflictException('Email already in use');
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // 🔥 NEW: transaction = User + UserWallet + UserStats
      const user = await this.prisma.$transaction(async (tx) => {
        // 1. Create the user
        const createdUser = await tx.user.create({
          data: {
            email: normEmail,
            passwordHash,
            // אם בעתיד תרצה להוסיף name לטבלה – כאן נשים אותו
            // name,
          },
          select: { id: true, email: true, createdAt: true },
        });

        // 2. Create the wallet with valid defaults
        await tx.userWallet.create({
          data: {
            userId: createdUser.id,
            xp: 0,
            level: 1,
            coins: 0,
            gems: 0,
            lifetimeXp: 0,
          },
        });

        // 3. Create the stats with valid defaults
        await tx.userStats.create({
          data: {
            userId: createdUser.id,
            sessionsCount: 0,
            successCount: 0,
            failCount: 0,
            averageScore: 0,
            averageMessageScore: 0,
            lastSessionAt: null,
          },
        });

        return createdUser;
      });

      return this.issue(user.id, user.email);
    } catch (err) {
      console.error('🔥 SIGNUP ERROR:', err);
      throw err;
    }
  }

  async refresh(refreshToken: string) {
    const [userId] = (refreshToken || '').split('.', 1);
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Invalid refresh token',
      });
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revoked: false },
    });

    const match = await findMatchingToken(tokens, refreshToken);
    if (!match) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Invalid refresh token',
      });
    }

    if (isBefore(match.expiresAt, new Date())) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_EXPIRED',
        message: 'Expired refresh token',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: match.id },
      data: { revoked: true },
    });

    return this.issue(userId);
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
  }
}

function cryptoRandom(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function findMatchingToken(
  rows: Array<{ id: string; tokenHash: string; expiresAt: Date }>,
  raw: string,
) {
  for (const r of rows) {
    if (await bcrypt.compare(raw, r.tokenHash)) return r;
  }
  return null;
}
