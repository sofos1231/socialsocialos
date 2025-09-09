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
          streakCurrent: 0,
        },
      },
      stats: {
        create: {
          totalSessions: 0,
          totalMissions: 0,
          totalXp: 0,
        },
      },
      // ensure progress exists
    },
  });

  // Ensure user progress exists
  await prisma.userProgress.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });

  // Categories
  const categories = [
    { key: 'dating', title: 'Dating & Romance', unlockedAtLevel: 1, premium: false },
    { key: 'interview', title: 'Interview & Career', unlockedAtLevel: 1, premium: false },
    { key: 'social', title: 'Social Confidence', unlockedAtLevel: 2, premium: false },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { key: c.key }, update: c as any, create: c as any });
  }

  // Create sample missions
  const missions = [
    { key: 'dating_intro', title: 'Dating Opener', description: 'Practice friendly openers', category: 'dating', type: 'chat', difficulty: 'beginner', rewards: JSON.stringify({ xp: 12 }), requirements: JSON.stringify({ minLevel: 1 }) },
    { key: 'interview_intro', title: 'Tell Me About Yourself', description: '30s pitch', category: 'interview', type: 'chat', difficulty: 'beginner', rewards: JSON.stringify({ xp: 15 }), requirements: JSON.stringify({ minLevel: 1 }), cooldownSec: 3600 },
    { key: 'social_smalltalk', title: 'Small Talk Sprint', description: 'Keep it flowing', category: 'social', type: 'chat', difficulty: 'beginner', rewards: JSON.stringify({ xp: 10 }), requirements: JSON.stringify({ minLevel: 2 }) },
    { key: 'premium_mastery', title: 'Premium Mastery', description: 'Exclusive premium mission', category: 'dating', type: 'chat', difficulty: 'intermediate', rewards: JSON.stringify({ xp: 20 }), requirements: JSON.stringify({ minLevel: 1 }), premium: true },
  ];
  for (const m of missions) {
    await prisma.mission.upsert({ where: { key: m.key }, update: m as any, create: m as any });
  }

  // Add a prereq-locked mission that depends on dating_intro
  const datingIntro = await prisma.mission.findUnique({ where: { key: 'dating_intro' } });
  if (datingIntro) {
    const prereqReq = { prerequisiteMissionIds: [datingIntro.id], minLevel: 1 } as any;
    await prisma.mission.upsert({
      where: { key: 'dating_followup' },
      update: { title: 'Dating Follow-up', category: 'dating', type: 'chat', difficulty: 'beginner', rewards: JSON.stringify({ xp: 14 }), requirements: JSON.stringify(prereqReq) } as any,
      create: { key: 'dating_followup', title: 'Dating Follow-up', description: 'Second step after opener', category: 'dating', type: 'chat', difficulty: 'beginner', rewards: JSON.stringify({ xp: 14 }), requirements: JSON.stringify(prereqReq) } as any,
    });
  }

  // Ensure cooldown lock coverage: set last completion for the cooldown mission to now
  const cooldownMission = await prisma.mission.findUnique({ where: { key: 'interview_intro' } });
  if (cooldownMission) {
    await prisma.userProgress.upsert({
      where: { userId: user.id },
      update: {
        lastCompletionByMission: JSON.stringify({ [cooldownMission.id]: new Date().toISOString() }),
        completedMissions: JSON.stringify([]),
      },
      create: {
        userId: user.id,
        lastCompletionByMission: JSON.stringify({ [cooldownMission.id]: new Date().toISOString() }),
        completedMissions: JSON.stringify([]),
      },
    });
  }

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

  console.log({ user, categories, missionsCount: missions.length, shopItems });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
