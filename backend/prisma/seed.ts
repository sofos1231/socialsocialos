import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      profile: {
        create: {
          level: 1,
          xp: 0,
          streak: 0,
        },
      },
      stats: {
        create: {
          totalSessions: 0,
          totalMissions: 0,
          totalXp: 0,
        },
      },
    },
  });

  // Create some sample missions
  const missions = await Promise.all([
    prisma.mission.create({
      data: {
        title: 'First Steps',
        description: 'Complete your first practice session',
        category: 'beginner',
        difficulty: 'beginner',
        xpReward: 10,
      },
    }),
    prisma.mission.create({
      data: {
        title: 'Streak Master',
        description: 'Maintain a 7-day streak',
        category: 'achievement',
        difficulty: 'intermediate',
        xpReward: 50,
      },
    }),
  ]);

  // Create some shop items
  const shopItems = await Promise.all([
    prisma.shopItem.create({
      data: {
        name: 'XP Booster',
        description: 'Double XP for 1 hour',
        price: 100,
        type: 'powerup',
      },
    }),
    prisma.shopItem.create({
      data: {
        name: 'Streak Protector',
        description: 'Protect your streak for 1 day',
        price: 50,
        type: 'powerup',
      },
    }),
  ]);

  console.log({ user, missions, shopItems });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
