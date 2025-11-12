import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      sessionVersion: 1,
    },
  });

  // Ensure a wallet exists with some balances
  await prisma.economyWallet.upsert({
    where: { userId: user.id },
    update: { coins: { increment: 100 }, diamonds: { increment: 5 } as any },
    create: { userId: user.id, coins: 100, diamonds: 5, tickets: 0 },
  } as any);

  // Seed a couple of entitlements for demo
  await prisma.entitlement.createMany({
    data: [
      { userId: user.id, key: 'premium_scenarios', active: true, startsAt: new Date(), source: 'seed' },
      { userId: user.id, key: 'ai_coach_boost_7d', active: true, startsAt: new Date(), source: 'seed' },
    ],
    skipDuplicates: true,
  } as any);

  console.log({ userId: user.id, seeded: true });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
