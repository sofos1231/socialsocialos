// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// ✅ correct path based on your tree: src/db/prisma.service.ts
import { PrismaModule } from '../../db/prisma.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

// Simple helper: turn "15m" | "2h" | "7d" | "900" into seconds (number)
function parseExpires(raw: string | undefined, fallback = 900): number {
  if (!raw) return fallback;
  if (/^\d+$/.test(raw)) return Number(raw); // already seconds
  const n = Number(raw.slice(0, -1));
  const unit = raw.slice(-1);
  if (Number.isNaN(n)) return fallback;
  switch (unit) {
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default:  return fallback;
  }
}

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret     = config.get<string>('JWT_SECRET');
        const privateKey = config.get<string>('JWT_PRIVATE_KEY'); // optional
        const publicKey  = config.get<string>('JWT_PUBLIC_KEY');  // optional

        const issuer    = config.get<string>('JWT_ISS') ?? 'socialgym';
        const audience  = config.get<string>('JWT_AUD') ?? 'socialgym-app';
        const expiresIn = parseExpires(config.get<string>('JWT_EXPIRES_IN') ?? '15m'); // number (seconds)

        if (privateKey && publicKey) {
          return {
            privateKey,
            publicKey,
            signOptions: { expiresIn, issuer, audience },
          };
        }
        if (!secret) {
          throw new Error('Configure JWT_SECRET or a key pair (JWT_PRIVATE_KEY/JWT_PUBLIC_KEY).');
        }
        return {
          secret,
          signOptions: { expiresIn, issuer, audience },
        };
      },
    }),
    RateLimitModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // Prisma provided via PrismaModule
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
