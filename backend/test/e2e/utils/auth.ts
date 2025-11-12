import request from 'supertest';
import { prisma } from './prisma';

export async function createTestUserAndToken(appUrl: string, email?: string) {
  const em = email || `test_${Date.now()}@example.com`;
  const res = await request(appUrl).post('/v1/auth/login').send({ email: em });
  if (res.status >= 400) throw new Error(`login failed ${res.status}`);
  const accessToken = res.body?.accessToken;
  const refreshToken = res.body?.refreshToken;
  const user = await prisma.user.findUnique({ where: { email: em } as any, select: { id: true } as any });
  return { userId: (user as any)?.id as string, accessToken, refreshToken };
}


