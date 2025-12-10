// backend/prisma/seed.ts
import { PrismaClient, MissionDifficulty, MissionGoalType, Gender, AttractionPath } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
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
  await prisma.userWallet.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      xp: 0,
      level: 1,
      coins: 250,
      gems: 15,
      lifetimeXp: 0,
    },
    update: {
      coins: 250,
      gems: 15,
    },
  });

  // Seed basic categories
  const [openersCategory, openersMaleCategory, flirtingCategory, recoveryCategory] =
    await Promise.all([
      prisma.missionCategory.upsert({
        where: { code: 'OPENERS' },
        update: {
          attractionPath: AttractionPath.FEMALE_PATH,
          isAttractionSensitive: true,
          dynamicLabelTemplate: 'Approach {{targetPlural}}',
          displayOrder: 0,
          active: true,
        },
        create: {
          code: 'OPENERS',
          label: 'Openers',
          description: 'First messages and icebreakers.',
          attractionPath: AttractionPath.FEMALE_PATH,
          isAttractionSensitive: true,
          dynamicLabelTemplate: 'Approach {{targetPlural}}',
          displayOrder: 0,
          active: true,
        },
      }),
      prisma.missionCategory.upsert({
        where: { code: 'OPENERS_MALE' },
        update: {
          attractionPath: AttractionPath.MALE_PATH,
          isAttractionSensitive: true,
          dynamicLabelTemplate: 'Approach {{targetPlural}}',
          displayOrder: 1,
          active: true,
        },
        create: {
          code: 'OPENERS_MALE',
          label: 'Approach Men',
          description: 'First messages and icebreakers for men.',
          attractionPath: AttractionPath.MALE_PATH,
          isAttractionSensitive: true,
          dynamicLabelTemplate: 'Approach {{targetPlural}}',
          displayOrder: 1,
          active: true,
        },
      }),
      prisma.missionCategory.upsert({
        where: { code: 'FLIRTING' },
        update: {
          attractionPath: AttractionPath.UNISEX,
          displayOrder: 2,
          active: true,
        },
        create: {
          code: 'FLIRTING',
          label: 'Flirting & Tension',
          description: 'Playfulness, teasing, tension control.',
          attractionPath: AttractionPath.UNISEX,
          displayOrder: 2,
          active: true,
        },
      }),
      prisma.missionCategory.upsert({
        where: { code: 'RECOVERY' },
        update: {
          attractionPath: AttractionPath.UNISEX,
          displayOrder: 3,
          active: true,
        },
        create: {
          code: 'RECOVERY',
          label: 'Recovery & Cold Replies',
          description: 'Fixing dead or cold conversations.',
          attractionPath: AttractionPath.UNISEX,
          displayOrder: 3,
          active: true,
        },
      }),
    ]);

  // Seed AI personas
  const [maya, noa, dan, omer] = await Promise.all([
    prisma.aiPersona.upsert({
      where: { code: 'MAYA_PLAYFUL' },
      update: {
        personaGender: Gender.FEMALE,
      },
      create: {
        code: 'MAYA_PLAYFUL',
        name: 'Maya',
        shortLabel: 'Playful',
        description: 'Fun, teasing, high-energy vibe.',
        style: 'playful',
        difficulty: 1,
        voicePreset: 'female_playful_1',
        personaGender: Gender.FEMALE,
        active: true,
      },
    }),
    prisma.aiPersona.upsert({
      where: { code: 'NOA_CALM' },
      update: {
        personaGender: Gender.FEMALE,
      },
      create: {
        code: 'NOA_CALM',
        name: 'Noa',
        shortLabel: 'Calm',
        description: 'Soft, warm, emotionally intelligent vibe.',
        style: 'calm',
        difficulty: 2,
        voicePreset: 'female_calm_1',
        personaGender: Gender.FEMALE,
        active: true,
      },
    }),
    prisma.aiPersona.upsert({
      where: { code: 'DAN_CONFIDENT' },
      update: {},
      create: {
        code: 'DAN_CONFIDENT',
        name: 'Dan',
        shortLabel: 'Confident',
        description: 'Direct, assertive, charismatic vibe.',
        style: 'confident',
        difficulty: 1,
        voicePreset: 'male_confident_1',
        personaGender: Gender.MALE,
        active: true,
      },
    }),
    prisma.aiPersona.upsert({
      where: { code: 'OMER_WARM' },
      update: {},
      create: {
        code: 'OMER_WARM',
        name: 'Omer',
        shortLabel: 'Warm',
        description: 'Friendly, approachable, emotionally intelligent vibe.',
        style: 'warm',
        difficulty: 2,
        voicePreset: 'male_warm_1',
        personaGender: Gender.MALE,
        active: true,
      },
    }),
  ]);

  // Seed a few mission templates for demo

  // Openers – lane 0 (attraction-sensitive missions)
  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M1' },
    update: {
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
    },
    create: {
      code: 'OPENERS_L1_M1',
      title: 'First Safe Opener',
      description: 'Send a simple, casual opener in under 30 seconds.',
      categoryId: openersCategory.id,
      personaId: maya.id,
      goalType: MissionGoalType.OPENING,
      difficulty: MissionDifficulty.EASY,
      timeLimitSec: 30,
      maxMessages: 3,
      wordLimit: 40,
      laneIndex: 0,
      orderIndex: 0,
      isVoiceSupported: true,
      baseXpReward: 50,
      baseCoinsReward: 10,
      baseGemsReward: 0,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
      active: true,
    },
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M2' },
    update: {
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
    },
    create: {
      code: 'OPENERS_L1_M2',
      title: 'Curious Opener',
      description: 'Ask a curiosity-based opener with a bit of personality.',
      categoryId: openersCategory.id,
      personaId: maya.id,
      goalType: MissionGoalType.OPENING,
      difficulty: MissionDifficulty.MEDIUM,
      timeLimitSec: 20,
      maxMessages: 2,
      wordLimit: 30,
      laneIndex: 0,
      orderIndex: 1,
      isVoiceSupported: true,
      baseXpReward: 70,
      baseCoinsReward: 15,
      baseGemsReward: 0,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
      active: true,
    },
  });

  // Openers – lane 0 (male-target attraction-sensitive missions)
  // Minimal seed to prove MEN path: at least one male-target mission
  // NOTE: These missions are in OPENERS_MALE category (MALE_PATH), not OPENERS (FEMALE_PATH)
  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M3_MALE' },
    update: {
      categoryId: openersMaleCategory.id,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.MALE,
    },
    create: {
      code: 'OPENERS_L1_M3_MALE',
      title: 'First Safe Opener',
      description: 'Send a simple, casual opener to a guy in under 30 seconds.',
      categoryId: openersMaleCategory.id,
      personaId: dan.id,
      goalType: MissionGoalType.OPENING,
      difficulty: MissionDifficulty.EASY,
      timeLimitSec: 30,
      maxMessages: 3,
      wordLimit: 40,
      laneIndex: 0,
      orderIndex: 0,
      isVoiceSupported: true,
      baseXpReward: 50,
      baseCoinsReward: 10,
      baseGemsReward: 0,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.MALE,
      active: true,
    },
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M4_MALE' },
    update: {
      categoryId: openersMaleCategory.id,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.MALE,
    },
    create: {
      code: 'OPENERS_L1_M4_MALE',
      title: 'Curious Opener',
      description: 'Ask a curiosity-based opener to a guy with a bit of personality.',
      categoryId: openersMaleCategory.id,
      personaId: omer.id,
      goalType: MissionGoalType.OPENING,
      difficulty: MissionDifficulty.MEDIUM,
      timeLimitSec: 20,
      maxMessages: 2,
      wordLimit: 30,
      laneIndex: 0,
      orderIndex: 1,
      isVoiceSupported: true,
      baseXpReward: 70,
      baseCoinsReward: 15,
      baseGemsReward: 0,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.MALE,
      active: true,
    },
  });

  // Flirting – lane 1
  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'FLIRTING_L1_M1' },
    update: {},
    create: {
      code: 'FLIRTING_L1_M1',
      title: 'Light Tease',
      description:
        'Turn a neutral reply into something playful without being cringe.',
      categoryId: flirtingCategory.id,
      personaId: noa.id,
      goalType: MissionGoalType.FLIRTING,
      difficulty: MissionDifficulty.EASY,
      timeLimitSec: 25,
      maxMessages: 3,
      wordLimit: 35,
      laneIndex: 1,
      orderIndex: 0,
      isVoiceSupported: true,
      baseXpReward: 60,
      baseCoinsReward: 12,
      baseGemsReward: 0,
      active: true,
    },
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'FLIRTING_L2_M1' },
    update: {},
    create: {
      code: 'FLIRTING_L2_M1',
      title: 'Build Tension Fast',
      description:
        'Raise the vibe quickly in 2 messages with a time limit per message.',
      categoryId: flirtingCategory.id,
      personaId: noa.id,
      goalType: MissionGoalType.FLIRTING,
      difficulty: MissionDifficulty.MEDIUM,
      timeLimitSec: 15,
      maxMessages: 2,
      wordLimit: 25,
      laneIndex: 1,
      orderIndex: 1,
      isVoiceSupported: true,
      baseXpReward: 80,
      baseCoinsReward: 20,
      baseGemsReward: 1,
      active: true,
    },
  });

  console.log({
    userId: user.id,
    seeded: true,
  });

  // Step 7.2: Seed EngineConfig
  const { EngineConfigService } = await import('../src/modules/engine-config/engine-config.service');
  const engineConfigService = new EngineConfigService(prisma);
  const defaultConfig = engineConfigService['getDefaultConfig']();
  await prisma.engineConfig.upsert({
    where: { key: 'GLOBAL_V1' },
    create: {
      key: 'GLOBAL_V1',
      configJson: defaultConfig as any,
    },
    update: {
      configJson: defaultConfig as any,
    },
  });
  console.log('✅ EngineConfig seeded');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
