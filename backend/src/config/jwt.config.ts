import { registerAs } from '@nestjs/config';

function parseAudience(raw?: string): string | string[] {
  if (!raw) return '';
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length <= 1 ? (parts[0] ?? '') : parts;
}

export default registerAs('jwt', () => ({
  issuer: process.env.JWT_ISS ?? '',
  audience: parseAudience(process.env.JWT_AUD),
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  alg: process.env.JWT_ALG ?? 'RS256',
  publicKey: process.env.JWT_PUBLIC_KEY ?? '',
  privateKey: process.env.JWT_PRIVATE_KEY ?? '',
  secret: process.env.JWT_SECRET ?? '',
}));
