// backend/src/modules/mood/mood.service.spec.ts
// Step 6.7: Tests for Mood Arc Detection

import { Test, TestingModule } from '@nestjs/testing';
import { MoodService } from './mood.service';
import { PrismaService } from '../../db/prisma.service';
import { MoodSnapshot } from './mood.types';

describe('MoodService - Step 6.7 Arc Detection', () => {
  let service: MoodService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodService,
        {
          provide: PrismaService,
          useValue: {
            missionMoodTimeline: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            practiceSession: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MoodService>(MoodService);
  });

  describe('detectMoodArcs (via buildTimelineForSession)', () => {
    it('should detect RISING_WARMTH arc for improving mood and warmth', () => {
      const snapshots: MoodSnapshot[] = [
        {
          turnIndex: 0,
          rawScore: 50,
          smoothedMoodScore: 50,
          moodState: 'NEUTRAL',
          tension: 50,
          warmth: 40,
          vibe: 50,
          flow: 50,
        },
        {
          turnIndex: 2,
          rawScore: 60,
          smoothedMoodScore: 55,
          moodState: 'WARM',
          tension: 45,
          warmth: 50,
          vibe: 55,
          flow: 55,
        },
        {
          turnIndex: 4,
          rawScore: 75,
          smoothedMoodScore: 65,
          moodState: 'WARM',
          tension: 40,
          warmth: 65,
          vibe: 65,
          flow: 65,
        },
      ];

      // Use reflection to access private method for testing
      const detectArcs = (service as any).detectMoodArcs.bind(service);
      const arcs = detectArcs(snapshots);

      expect(arcs.length).toBeGreaterThan(0);
      const risingWarmthArc = arcs.find((a: any) => a.type === 'RISING_WARMTH');
      expect(risingWarmthArc).toBeDefined();
    });

    it('should detect RECOVERY_ARC when recovering from low mood', () => {
      const snapshots: MoodSnapshot[] = [
        {
          turnIndex: 0,
          rawScore: 30,
          smoothedMoodScore: 30,
          moodState: 'COLD',
          tension: 70,
          warmth: 30,
          vibe: 30,
          flow: 30,
        },
        {
          turnIndex: 2,
          rawScore: 50,
          smoothedMoodScore: 40,
          moodState: 'NEUTRAL',
          tension: 60,
          warmth: 45,
          vibe: 45,
          flow: 40,
        },
        {
          turnIndex: 4,
          rawScore: 70,
          smoothedMoodScore: 55,
          moodState: 'WARM',
          tension: 50,
          warmth: 60,
          vibe: 60,
          flow: 55,
        },
      ];

      const detectArcs = (service as any).detectMoodArcs.bind(service);
      const arcs = detectArcs(snapshots);

      const recoveryArc = arcs.find((a: any) => a.type === 'RECOVERY_ARC');
      expect(recoveryArc).toBeDefined();
    });

    it('should detect TESTING_SPIKE for sudden tension increase', () => {
      const snapshots: MoodSnapshot[] = [
        {
          turnIndex: 0,
          rawScore: 70,
          smoothedMoodScore: 70,
          moodState: 'WARM',
          tension: 40,
          warmth: 60,
          vibe: 65,
          flow: 70,
        },
        {
          turnIndex: 2,
          rawScore: 40,
          smoothedMoodScore: 55,
          moodState: 'TENSE',
          tension: 80,
          warmth: 40,
          vibe: 40,
          flow: 50,
        },
      ];

      const detectArcs = (service as any).detectMoodArcs.bind(service);
      const arcs = detectArcs(snapshots);

      const testingSpike = arcs.find((a: any) => a.type === 'TESTING_SPIKE');
      expect(testingSpike).toBeDefined();
    });

    it('should detect COOL_DOWN arc for declining mood and warmth', () => {
      const snapshots: MoodSnapshot[] = [
        {
          turnIndex: 0,
          rawScore: 80,
          smoothedMoodScore: 80,
          moodState: 'WARM',
          tension: 30,
          warmth: 75,
          vibe: 80,
          flow: 80,
        },
        {
          turnIndex: 2,
          rawScore: 60,
          smoothedMoodScore: 70,
          moodState: 'NEUTRAL',
          tension: 40,
          warmth: 60,
          vibe: 65,
          flow: 70,
        },
        {
          turnIndex: 4,
          rawScore: 40,
          smoothedMoodScore: 55,
          moodState: 'COLD',
          tension: 50,
          warmth: 40,
          vibe: 45,
          flow: 50,
        },
      ];

      const detectArcs = (service as any).detectMoodArcs.bind(service);
      const arcs = detectArcs(snapshots);

      const coolDownArc = arcs.find((a: any) => a.type === 'COOL_DOWN');
      expect(coolDownArc).toBeDefined();
    });
  });

  describe('buildTimelineForSession - toggle behavior', () => {
    it('should skip arcs when enableArcDetection is false', async () => {
      const mockPrisma = {
        practiceSession: {
          findUnique: jest.fn().mockResolvedValue({
            payload: {
              normalizedMissionConfigV1: {
                statePolicy: {
                  enableArcDetection: false,
                },
              },
            },
          }),
        },
        chatMessage: {
          findMany: jest.fn().mockResolvedValue([
            {
              turnIndex: 0,
              role: 'USER',
              score: 50,
              traitData: { traits: {}, patterns: [], hooks: [] },
            },
            {
              turnIndex: 2,
              role: 'USER',
              score: 60,
              traitData: { traits: {}, patterns: [], hooks: [] },
            },
          ]),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          MoodService,
          {
            provide: PrismaService,
            useValue: mockPrisma,
          },
        ],
      }).compile();

      const testService = module.get<MoodService>(MoodService);
      
      // Mock loadSessionAnalyticsSnapshot
      jest.spyOn(require('../shared/helpers/session-snapshot.helper'), 'loadSessionAnalyticsSnapshot')
        .mockResolvedValue({
          messages: [
            {
              turnIndex: 0,
              role: 'USER',
              score: 50,
              traitData: { traits: {}, patterns: [], hooks: [] },
            },
            {
              turnIndex: 2,
              role: 'USER',
              score: 60,
              traitData: { traits: {}, patterns: [], hooks: [] },
            },
          ],
        });

      const timeline = await testService.buildTimelineForSession('test-session-id');

      expect(timeline.arcs).toEqual([]);
    });
  });
});

