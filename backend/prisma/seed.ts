// backend/prisma/seed.ts
import { PrismaClient, MissionDifficulty, MissionGoalType, Gender, AttractionPath, AiStyleKey } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  buildOpenersMissionConfigV1,
  buildFlirtingMissionConfigV1,
} from '../src/modules/missions-admin/mission-config-v1.builders';

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
  const openersL1M1Config = buildOpenersMissionConfigV1({
    difficultyLevel: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.PLAYFUL, // MAYA_PLAYFUL persona
    maxMessages: 3,
    timeLimitSec: 30,
    wordLimit: 40,
    userTitle: 'First Safe Opener',
    userDescription: 'Send a simple, casual opener in under 30 seconds.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M1' },
    update: {
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
      aiContract: { missionConfigV1: openersL1M1Config },
    },
    create: {
      code: 'OPENERS_L1_M1',
      title: 'First Safe Opener',
      description: 'Send a simple, casual opener in under 30 seconds.',
      category: { connect: { id: openersCategory.id } },
      persona: { connect: { id: maya.id } },
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
      aiContract: { missionConfigV1: openersL1M1Config },
    },
  });

  const openersL1M2Config = buildOpenersMissionConfigV1({
    difficultyLevel: MissionDifficulty.MEDIUM,
    aiStyleKey: AiStyleKey.PLAYFUL, // MAYA_PLAYFUL persona
    maxMessages: 2,
    timeLimitSec: 20,
    wordLimit: 30,
    userTitle: 'Curious Opener',
    userDescription: 'Ask a curiosity-based opener with a bit of personality.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M2' },
    update: {
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
      aiContract: { missionConfigV1: openersL1M2Config },
    },
    create: {
      code: 'OPENERS_L1_M2',
      title: 'Curious Opener',
      description: 'Ask a curiosity-based opener with a bit of personality.',
      category: { connect: { id: openersCategory.id } },
      persona: { connect: { id: maya.id } },
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
      aiContract: { missionConfigV1: openersL1M2Config },
    },
  });

  // Openers – lane 0 (male-target attraction-sensitive missions)
  // Minimal seed to prove MEN path: at least one male-target mission
  // NOTE: These missions are in OPENERS_MALE category (MALE_PATH), not OPENERS (FEMALE_PATH)
  const openersL1M3MaleConfig = buildOpenersMissionConfigV1({
    difficultyLevel: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.DIRECT, // DAN_CONFIDENT persona (confident/direct)
    maxMessages: 3,
    timeLimitSec: 30,
    wordLimit: 40,
    userTitle: 'First Safe Opener',
    userDescription: 'Send a simple, casual opener to a guy in under 30 seconds.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M3_MALE' },
    update: {
      category: { connect: { id: openersMaleCategory.id } },
      isAttractionSensitive: true,
      targetRomanticGender: Gender.MALE,
      aiContract: { missionConfigV1: openersL1M3MaleConfig },
    },
    create: {
      code: 'OPENERS_L1_M3_MALE',
      title: 'First Safe Opener',
      description: 'Send a simple, casual opener to a guy in under 30 seconds.',
      category: { connect: { id: openersMaleCategory.id } },
      persona: { connect: { id: dan.id } },
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
      aiContract: { missionConfigV1: openersL1M3MaleConfig },
    },
  });

  const openersL1M4MaleConfig = buildOpenersMissionConfigV1({
    difficultyLevel: MissionDifficulty.MEDIUM,
    aiStyleKey: AiStyleKey.WARM, // OMER_WARM persona
    maxMessages: 2,
    timeLimitSec: 20,
    wordLimit: 30,
    userTitle: 'Curious Opener',
    userDescription: 'Ask a curiosity-based opener to a guy with a bit of personality.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M4_MALE' },
    update: {
      category: { connect: { id: openersMaleCategory.id } },
      isAttractionSensitive: true,
      targetRomanticGender: Gender.MALE,
      aiContract: { missionConfigV1: openersL1M4MaleConfig },
    },
    create: {
      code: 'OPENERS_L1_M4_MALE',
      title: 'Curious Opener',
      description: 'Ask a curiosity-based opener to a guy with a bit of personality.',
      category: { connect: { id: openersMaleCategory.id } },
      persona: { connect: { id: omer.id } },
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
      aiContract: { missionConfigV1: openersL1M4MaleConfig },
    },
  });

  // Flirting – lane 1
  const flirtingL1M1Config = buildFlirtingMissionConfigV1({
    difficultyLevel: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.WARM, // NOA_CALM persona (calm/warm vibe)
    maxMessages: 3,
    timeLimitSec: 25,
    wordLimit: 35,
    userTitle: 'Light Tease',
    userDescription: 'Turn a neutral reply into something playful without being cringe.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'FLIRTING_L1_M1' },
    update: {
      aiContract: { missionConfigV1: flirtingL1M1Config },
    },
    create: {
      code: 'FLIRTING_L1_M1',
      title: 'Light Tease',
      description:
        'Turn a neutral reply into something playful without being cringe.',
      category: { connect: { id: flirtingCategory.id } },
      persona: { connect: { id: noa.id } },
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
      aiContract: { missionConfigV1: flirtingL1M1Config },
    },
  });

  const flirtingL2M1Config = buildFlirtingMissionConfigV1({
    difficultyLevel: MissionDifficulty.MEDIUM,
    aiStyleKey: AiStyleKey.WARM, // NOA_CALM persona (calm/warm vibe)
    maxMessages: 2,
    timeLimitSec: 15,
    wordLimit: 25,
    userTitle: 'Build Tension Fast',
    userDescription: 'Raise the vibe quickly in 2 messages with a time limit per message.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'FLIRTING_L2_M1' },
    update: {
      aiContract: { missionConfigV1: flirtingL2M1Config },
    },
    create: {
      code: 'FLIRTING_L2_M1',
      title: 'Build Tension Fast',
      description:
        'Raise the vibe quickly in 2 messages with a time limit per message.',
      category: { connect: { id: flirtingCategory.id } },
      persona: { connect: { id: noa.id } },
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
      aiContract: { missionConfigV1: flirtingL2M1Config },
    },
  });

  console.log({
    userId: user.id,
    seeded: true,
  });

  // Step 7.2: Seed EngineConfig
  const { EngineConfigService } = await import('../src/modules/engine-config/engine-config.service');
  const engineConfigService = new EngineConfigService(prisma);
  const defaultConfig = engineConfigService.getDefaultConfig();
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

  // Wave 1: Seed AI Styles (≥3 styles)
  const aiStyles = [
    {
      key: AiStyleKey.NEUTRAL,
      name: 'Neutral',
      description: 'Balanced, neutral communication style with no strong emotional bias.',
      stylePrompt: 'You communicate in a neutral, balanced manner. You are neither overly warm nor cold, neither playful nor serious. You respond naturally and authentically without forcing any particular emotional tone.',
      forbiddenBehavior: 'Do not be overly emotional, dramatic, or pushy. Avoid being too casual or too formal.',
      maxChars: 500,
      maxLines: 10,
      questionRate: 40,
      emojiRate: 20,
      initiative: 50,
      warmth: 50,
      judgment: 50,
      flirtTension: 30,
      formality: 50,
      temperature: null,
      topP: null,
      fewShotExamples: null,
      isActive: true,
    },
    {
      key: AiStyleKey.WARM,
      name: 'Friendly',
      description: 'Warm, friendly, and approachable communication style.',
      stylePrompt: 'You communicate in a warm, friendly manner. You are approachable, kind, and show genuine interest in the conversation. You use positive language and create a comfortable atmosphere.',
      forbiddenBehavior: 'Do not be cold, dismissive, or overly formal. Avoid being too pushy or aggressive.',
      maxChars: 600,
      maxLines: 12,
      questionRate: 50,
      emojiRate: 40,
      initiative: 55,
      warmth: 70,
      judgment: 40,
      flirtTension: 35,
      formality: 30,
      temperature: null,
      topP: null,
      fewShotExamples: null,
      isActive: true,
    },
    {
      key: AiStyleKey.CHALLENGING,
      name: 'Challenging',
      description: 'Direct, challenging communication style that pushes boundaries.',
      stylePrompt: 'You communicate in a direct, challenging manner. You are not afraid to push back, ask tough questions, or challenge assumptions. You maintain respect but don\'t shy away from difficult conversations.',
      forbiddenBehavior: 'Do not be passive, overly accommodating, or avoid conflict. Avoid being rude or disrespectful.',
      maxChars: 450,
      maxLines: 8,
      questionRate: 60,
      emojiRate: 15,
      initiative: 65,
      warmth: 35,
      judgment: 60,
      flirtTension: 45,
      formality: 60,
      temperature: null,
      topP: null,
      fewShotExamples: null,
      isActive: true,
    },
  ];

  for (const styleData of aiStyles) {
    await prisma.aiStyle.upsert({
      where: { key: styleData.key },
      update: styleData,
      create: styleData,
    });
  }
  console.log(`✅ ${aiStyles.length} AI Styles seeded`);

  // Wave 1: Seed PromptHooks (≥10 hooks: 5 positive, 5 negative)
  const hooks = [
    // Positive hooks (5)
    {
      name: 'Genuine Compliment',
      type: 'POSITIVE',
      textTemplate: 'That was a really thoughtful response. I appreciate how you {context}.',
      conditionsJson: { minScore: 60 },
      category: 'engagement',
      tags: ['compliment', 'positive'],
      priority: 70,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 300, maxTriggersPerSession: 2 },
    },
    {
      name: 'Curiosity Follow-up',
      type: 'POSITIVE',
      textTemplate: 'That\'s interesting! Tell me more about {topic}.',
      conditionsJson: { hasQuestion: true },
      category: 'engagement',
      tags: ['curiosity', 'follow-up'],
      priority: 65,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 180, maxTriggersPerSession: 3 },
    },
    {
      name: 'Humor Recognition',
      type: 'POSITIVE',
      textTemplate: 'Haha, that was clever! I like your sense of humor.',
      conditionsJson: { humorScore: { min: 70 } },
      category: 'engagement',
      tags: ['humor', 'positive'],
      priority: 60,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 240, maxTriggersPerSession: 2 },
    },
    {
      name: 'Vulnerability Acknowledgment',
      type: 'POSITIVE',
      textTemplate: 'I appreciate you sharing that. It takes courage to be open.',
      conditionsJson: { vulnerabilityScore: { min: 60 } },
      category: 'engagement',
      tags: ['vulnerability', 'support'],
      priority: 75,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 360, maxTriggersPerSession: 1 },
    },
    {
      name: 'Progress Encouragement',
      type: 'POSITIVE',
      textTemplate: 'You\'re doing great! Keep going with that energy.',
      conditionsJson: { momentumScore: { min: 65 } },
      category: 'engagement',
      tags: ['encouragement', 'momentum'],
      priority: 55,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 300, maxTriggersPerSession: 2 },
    },
    // Negative hooks (5)
    {
      name: 'Soft Redirect',
      type: 'NEGATIVE',
      textTemplate: 'Hmm, that might not be the best approach. Try thinking about it from a different angle.',
      conditionsJson: { scoreDrop: { threshold: -15 } },
      category: 'correction',
      tags: ['redirect', 'soft'],
      priority: 80,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 120, maxTriggersPerSession: 3 },
    },
    {
      name: 'Clarity Request',
      type: 'NEGATIVE',
      textTemplate: 'I\'m not sure I understand. Can you clarify what you mean?',
      conditionsJson: { clarityScore: { max: 40 } },
      category: 'correction',
      tags: ['clarity', 'request'],
      priority: 70,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 180, maxTriggersPerSession: 2 },
    },
    {
      name: 'Boundary Reminder',
      type: 'NEGATIVE',
      textTemplate: 'That might be pushing it a bit. Remember to respect boundaries.',
      conditionsJson: { boundaryViolation: true },
      category: 'correction',
      tags: ['boundary', 'reminder'],
      priority: 90,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 240, maxTriggersPerSession: 1 },
    },
    {
      name: 'Tone Adjustment',
      type: 'NEGATIVE',
      textTemplate: 'The tone feels a bit off. Maybe try a more {suggestedTone} approach?',
      conditionsJson: { toneMismatch: true },
      category: 'correction',
      tags: ['tone', 'adjustment'],
      priority: 65,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 200, maxTriggersPerSession: 2 },
    },
    {
      name: 'Engagement Nudge',
      type: 'NEGATIVE',
      textTemplate: 'That response was a bit short. Try adding more detail or asking a follow-up question.',
      conditionsJson: { messageLength: { max: 20 }, engagementScore: { max: 45 } },
      category: 'correction',
      tags: ['engagement', 'nudge'],
      priority: 60,
      isEnabled: true,
      version: 'v1',
      metaJson: { cooldownSeconds: 150, maxTriggersPerSession: 3 },
    },
  ];

  for (const hookData of hooks) {
    // Idempotent: check if hook with same name+type exists, then upsert
    const existing = await prisma.promptHook.findFirst({
      where: {
        name: hookData.name,
        type: hookData.type,
      },
    });
    if (existing) {
      await prisma.promptHook.update({
        where: { id: existing.id },
        data: hookData,
      });
    } else {
      await prisma.promptHook.create({
        data: hookData,
      });
    }
  }
  console.log(`✅ ${hooks.length} PromptHooks seeded`);

  // Wave 1: Seed 1 Neutral/Social Mission (isAttractionSensitive = false)
  const socialNeutralConfig = buildFlirtingMissionConfigV1({
    difficultyLevel: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.NEUTRAL,
    maxMessages: 5,
    timeLimitSec: 60,
    wordLimit: 50,
    userTitle: 'Casual Conversation',
    userDescription: 'Have a friendly, neutral conversation without any romantic pressure. Practice natural social interaction.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'SOCIAL_NEUTRAL_L1_M1' },
    update: {
      aiContract: { missionConfigV1: socialNeutralConfig },
      isAttractionSensitive: false,
    },
    create: {
      code: 'SOCIAL_NEUTRAL_L1_M1',
      title: 'Casual Conversation',
      description: 'Have a friendly, neutral conversation without any romantic pressure. Practice natural social interaction.',
      category: { connect: { id: flirtingCategory.id } }, // Use existing flirting category
      persona: { connect: { id: noa.id } }, // Use existing persona
      goalType: MissionGoalType.FREE_EXPLORATION,
      difficulty: MissionDifficulty.EASY,
      timeLimitSec: 60,
      maxMessages: 5,
      wordLimit: 50,
      laneIndex: 0,
      orderIndex: 0,
      isVoiceSupported: true,
      baseXpReward: 50,
      baseCoinsReward: 10,
      baseGemsReward: 0,
      isAttractionSensitive: false, // Neutral mission - not attraction sensitive
      targetRomanticGender: null, // No specific gender target
      active: true,
      aiContract: { missionConfigV1: socialNeutralConfig },
    },
  });
  console.log('✅ Neutral/Social mission seeded (SOCIAL_NEUTRAL_L1_M1)');

  // Seed Cold Approach Cafe Easy mission
  const coldApproachCafeEasyConfig = buildOpenersMissionConfigV1({
    difficultyLevel: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.NEUTRAL,
    maxMessages: 6,
    timeLimitSec: 0, // No per-message timer
    wordLimit: null,
    userTitle: 'Cold approach opener',
    userDescription: 'Approach her in a cafe. Open light and playful. Get a positive reply and ask one natural follow-up question.',
  });
  // Override locationTag and timer settings for cafe context
  coldApproachCafeEasyConfig.dynamics.locationTag = 'CAFE';
  coldApproachCafeEasyConfig.dynamics.hasPerMessageTimer = false;
  coldApproachCafeEasyConfig.statePolicy.timerSecondsPerMessage = null;
  coldApproachCafeEasyConfig.statePolicy.allowTimerExtension = false;

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'COLD_APPROACH_CAFE_EASY' },
    update: {
      aiContract: { missionConfigV1: coldApproachCafeEasyConfig },
      active: true,
    },
    create: {
      code: 'COLD_APPROACH_CAFE_EASY',
      title: 'Cold Approach — Cafe Opener (Easy)',
      description: 'Approach her in a cafe. Open light and playful. Get a positive reply and ask one natural follow-up question.',
      category: { connect: { id: openersCategory.id } },
      persona: { connect: { id: maya.id } },
      goalType: MissionGoalType.OPENING,
      difficulty: MissionDifficulty.EASY,
      timeLimitSec: 0, // No per-message timer
      maxMessages: 6,
      wordLimit: null,
      laneIndex: 0,
      orderIndex: 999, // Place at end of lane
      isVoiceSupported: false,
      baseXpReward: 50,
      baseCoinsReward: 10,
      baseGemsReward: 0,
      isAttractionSensitive: true,
      targetRomanticGender: Gender.FEMALE,
      active: true,
      aiContract: { missionConfigV1: coldApproachCafeEasyConfig },
    },
  });
  console.log('✅ Cold Approach Cafe Easy mission seeded (COLD_APPROACH_CAFE_EASY)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
