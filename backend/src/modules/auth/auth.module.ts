import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../db/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const pub = config.get<string>('JWT_PUBLIC_KEY');
        const alg = (config.get<string>('JWT_ALG') || '').toUpperCase();
        const expiresIn = config.get<string>('JWT_EXPIRES_IN');
        const iss = config.get<string>('JWT_ISS');
        const aud = config.get<string>('JWT_AUD');
        if (!secret && !pub) throw new Error('JWT secret or public key must be configured');
        if (!alg) throw new Error('JWT_ALG must be configured');
        if (!iss) throw new Error('JWT_ISS must be configured');
        if (!aud) throw new Error('JWT_AUD must be configured');
        if (!expiresIn) throw new Error('JWT_EXPIRES_IN must be configured');
        return {
          secret: secret || undefined,
          signOptions: { algorithm: alg as any, expiresIn, issuer: iss, audience: aud },
        };
      },
    }),
    RateLimitModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}


