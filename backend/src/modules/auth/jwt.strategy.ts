import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

function fromCommonHeaders(req: any): string | null {
  const h = req?.headers || {};
  const auth = (h.authorization || h.Authorization) as string | undefined;
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const token = h['x-auth-token'] || h['x-access-token'] || h['token'];
  if (typeof token === 'string' && token.length > 0) return token;
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const alg = (config.get<string>('JWT_ALG') || '').toUpperCase();
    if (!alg) throw new Error('JWT_ALG must be configured');
    const jwtFromRequest = ExtractJwt.fromExtractors([
      ExtractJwt.fromAuthHeaderAsBearerToken(),
      fromCommonHeaders, // accept x-auth-token / token fallbacks
    ]);
    const ignoreExpiration = false;
    const iss = config.get<string>('JWT_ISS');
    const aud = config.get<string>('JWT_AUD');
    if (!iss) throw new Error('JWT_ISS must be configured');
    if (!aud) throw new Error('JWT_AUD must be configured');
    const clockTolerance = 60; // seconds for mobile clock drift
    const base: any = { jwtFromRequest, ignoreExpiration, algorithms: [alg], issuer: iss, audience: aud, clockTolerance };

    if (alg === 'HS256') {
      const secret = config.get<string>('JWT_SECRET');
      if (!secret) throw new Error('JWT_SECRET must be configured for HS256');
      super({ ...base, secretOrKey: secret });
    } else {
      const pub = (config.get<string>('JWT_PUBLIC_KEY') || '').replace(/\\n/g, '\n');
      if (!pub) throw new Error('JWT_PUBLIC_KEY must be configured for asymmetric algorithms');
      super({ ...base, secretOrKey: pub });
    }
  }

  async validate(payload: any) {
    return { userId: payload.sub, sub: payload.sub, email: payload.email };
  }
}
