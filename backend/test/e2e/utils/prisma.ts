import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL } } });

export async function resetDb() {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'"
  );
  const names = tables.map(t => `"${t.tablename}"`).join(', ');
  if (names.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
  }
}


