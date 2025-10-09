import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const startsAt = new Date(Date.now() - 5 * 60 * 1000);
  const endsAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.limitedDeal.create({
    data: {
      key: 'double_diamond_bonus',
      startsAt,
      endsAt,
      rules: { multiplier: 2 },
      active: true,
    },
  });
  console.log('Deal created.');
}

main().finally(async () => {
  await prisma.$disconnect();
});


