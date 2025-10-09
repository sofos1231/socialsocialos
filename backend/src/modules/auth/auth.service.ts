import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../db/prisma.service';
import * as bcrypt from 'bcrypt';

const ISSUER = 'socialgym';
const AUDIENCE = 'socialgym-app';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string) {
    const user = await this.prisma.user.upsert({
      where: { email },
      update: { sessionVersion: { increment: 1 } },
      create: { email, sessionVersion: 1 },
      select: { id: true, email: true, sessionVersion: true },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sv: user.sessionVersion },
      { issuer: ISSUER, audience: AUDIENCE, expiresIn: '15m' }
    );
    return { accessToken, user: { id: user.id, email: user.email } };
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    return { ok: true };
  }

  async verify(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token, { issuer: ISSUER, audience: AUDIENCE });
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
}


