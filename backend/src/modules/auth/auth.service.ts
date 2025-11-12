import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../db/prisma.service';
import bcrypt from 'bcryptjs';
import { addDays, isBefore } from 'date-fns';
import { ConfigService } from '@nestjs/config';

const ISSUER_FALLBACK = undefined as unknown as string; // force config usage
const AUDIENCE_FALLBACK = undefined as unknown as string;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  private async issue(userId: string, email?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true, email: true } });
    if (!user) throw new UnauthorizedException({ code: 'AUTH_USER_NOT_FOUND', message: 'User not found' });
    const iss = this.config.get<string>('JWT_ISS');
    const aud = this.config.get<string>('JWT_AUD');
    if (!iss || !aud) throw new UnauthorizedException({ code: 'AUTH_CONFIG_INVALID', message: 'JWT issuer/audience not configured' });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sv: user.sessionVersion, email: email || user.email },
      { issuer: iss, audience: aud }
    );
    const rawRefresh = `${userId}.${cryptoRandom(36)}`;
    const tokenHash = await bcrypt.hash(rawRefresh, 10);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt: addDays(new Date(), 30) },
    });
    return { accessToken, refreshToken: rawRefresh };
  }

  async login(email: string) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { sessionVersion: { increment: 1 } },
      create: { email, sessionVersion: 1, passwordHash },
      select: { id: true, email: true },
    });
    return this.issue(user.id, user.email);
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    return { ok: true };
  }

  async verify(token: string) {
    try {
      const iss = this.config.get<string>('JWT_ISS');
      const aud = this.config.get<string>('JWT_AUD');
      const payload = await this.jwt.verifyAsync(token, { issuer: iss, audience: aud });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { sessionVersion: true } });
      if (!user || user.sessionVersion !== payload.sv) {
        throw new UnauthorizedException({ code: 'AUTH_SESSION_REVOKED', message: 'Session revoked' });
      }
      return payload as { sub: string; sv: number };
    } catch (e) {
      throw new UnauthorizedException({ code: 'AUTH_INVALID', message: 'Invalid or expired token' });
    }
  }

  async signup(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
    return user;
  }

  async refresh(refreshToken: string) {
    const [userId] = (refreshToken || '').split('.', 1);
    if (!userId) throw new UnauthorizedException({ code: 'AUTH_REFRESH_INVALID', message: 'Invalid refresh token' });
    const tokens = await this.prisma.refreshToken.findMany({ where: { userId, revoked: false } });
    const match = await findMatchingToken(tokens, refreshToken);
    if (!match) throw new UnauthorizedException({ code: 'AUTH_REFRESH_INVALID', message: 'Invalid refresh token' });
    if (isBefore(match.expiresAt, new Date())) throw new UnauthorizedException({ code: 'AUTH_REFRESH_EXPIRED', message: 'Expired refresh token' });
    await this.prisma.refreshToken.update({ where: { id: match.id }, data: { revoked: true } });
    return this.issue(userId);
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    await this.prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  }
}

function cryptoRandom(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function findMatchingToken(rows: Array<{ id: string; tokenHash: string; expiresAt: Date }>, raw: string) {
  for (const r of rows) {
    if (await bcrypt.compare(raw, r.tokenHash)) return r;
  }
  return null;
}


