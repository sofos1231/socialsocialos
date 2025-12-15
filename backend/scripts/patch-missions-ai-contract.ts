// FILE: backend/scripts/patch-missions-ai-contract.ts
// Phase 2 / Part 1: Patch script to add aiContract to existing missions
//
// USAGE:
//   npx ts-node backend/scripts/patch-missions-ai-contract.ts
//
// This script finds missions by code and sets aiContract if it's null.
// It leaves existing non-null aiContract values unchanged.

import { PrismaClient, AiStyleKey, MissionDifficulty } from '@prisma/client';
import {
  buildOpenersMissionConfigV1,
  buildFlirtingMissionConfigV1,
} from '../src/modules/missions-admin/mission-config-v1.builders';

const prisma = new PrismaClient();

/**
 * Maps mission codes to their configuration parameters.
 * This matches the seed.ts structure.
 */
const MISSION_CONFIGS: Record<
  string,
  {
    builder: 'openers' | 'flirting';
    difficulty: MissionDifficulty;
    aiStyleKey: AiStyleKey;
    maxMessages: number;
    timeLimitSec: number;
    wordLimit?: number | null;
    userTitle: string;
    userDescription: string;
  }
> = {
  OPENERS_L1_M1: {
    builder: 'openers',
    difficulty: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.PLAYFUL,
    maxMessages: 3,
    timeLimitSec: 30,
    wordLimit: 40,
    userTitle: 'First Safe Opener',
    userDescription: 'Send a simple, casual opener in under 30 seconds.',
  },
  OPENERS_L1_M2: {
    builder: 'openers',
    difficulty: MissionDifficulty.MEDIUM,
    aiStyleKey: AiStyleKey.PLAYFUL,
    maxMessages: 2,
    timeLimitSec: 20,
    wordLimit: 30,
    userTitle: 'Curious Opener',
    userDescription: 'Ask a curiosity-based opener with a bit of personality.',
  },
  OPENERS_L1_M3_MALE: {
    builder: 'openers',
    difficulty: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.DIRECT,
    maxMessages: 3,
    timeLimitSec: 30,
    wordLimit: 40,
    userTitle: 'First Safe Opener',
    userDescription: 'Send a simple, casual opener to a guy in under 30 seconds.',
  },
  OPENERS_L1_M4_MALE: {
    builder: 'openers',
    difficulty: MissionDifficulty.MEDIUM,
    aiStyleKey: AiStyleKey.WARM,
    maxMessages: 2,
    timeLimitSec: 20,
    wordLimit: 30,
    userTitle: 'Curious Opener',
    userDescription: 'Ask a curiosity-based opener to a guy with a bit of personality.',
  },
  FLIRTING_L1_M1: {
    builder: 'flirting',
    difficulty: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.WARM,
    maxMessages: 3,
    timeLimitSec: 25,
    wordLimit: 35,
    userTitle: 'Light Tease',
    userDescription: 'Turn a neutral reply into something playful without being cringe.',
  },
  FLIRTING_L2_M1: {
    builder: 'flirting',
    difficulty: MissionDifficulty.MEDIUM,
    aiStyleKey: AiStyleKey.WARM,
    maxMessages: 2,
    timeLimitSec: 15,
    wordLimit: 25,
    userTitle: 'Build Tension Fast',
    userDescription: 'Raise the vibe quickly in 2 messages with a time limit per message.',
  },
};

async function main() {
  console.log('🔧 Patching missions with aiContract...\n');

  let patched = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [code, config] of Object.entries(MISSION_CONFIGS)) {
    const mission = await prisma.practiceMissionTemplate.findUnique({
      where: { code },
      select: { id: true, code: true, title: true, aiContract: true },
    });

    if (!mission) {
      console.log(`⚠️  Mission ${code} not found, skipping`);
      notFound++;
      continue;
    }

    // Skip if aiContract already exists
    if (mission.aiContract !== null && mission.aiContract !== undefined) {
      console.log(`⏭️  Mission ${code} already has aiContract, skipping`);
      skipped++;
      continue;
    }

    // Build mission config
    const missionConfigV1 =
      config.builder === 'openers'
        ? buildOpenersMissionConfigV1({
            difficultyLevel: config.difficulty,
            aiStyleKey: config.aiStyleKey,
            maxMessages: config.maxMessages,
            timeLimitSec: config.timeLimitSec,
            wordLimit: config.wordLimit,
            userTitle: config.userTitle,
            userDescription: config.userDescription,
          })
        : buildFlirtingMissionConfigV1({
            difficultyLevel: config.difficulty,
            aiStyleKey: config.aiStyleKey,
            maxMessages: config.maxMessages,
            timeLimitSec: config.timeLimitSec,
            wordLimit: config.wordLimit,
            userTitle: config.userTitle,
            userDescription: config.userDescription,
          });

    // Update mission
    await prisma.practiceMissionTemplate.update({
      where: { code },
      data: {
        aiContract: { missionConfigV1 },
      },
    });

    console.log(`✅ Patched ${code} (${mission.title})`);
    patched++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Patched: ${patched}`);
  console.log(`   ⏭️  Skipped (already has aiContract): ${skipped}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log(`\n✨ Done!`);
}

main()
  .catch((e) => {
    console.error('❌ Patch error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

