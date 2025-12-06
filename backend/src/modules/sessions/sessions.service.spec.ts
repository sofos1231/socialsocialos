// backend/src/modules/sessions/sessions.service.spec.ts
// Step 5.1 tests for sessions.service.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../db/prisma.service';
import { SessionsService } from './sessions.service';
import { StatsService } from '../stats/stats.service';
import { MessageRole } from '@prisma/client';
import { AiSessionResult } from '../ai/ai-scoring.types';

describe('SessionsService - Step 5.1', () => {
  let service: SessionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            practiceSession: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            chatMessage: {
              deleteMany: jest.fn(),
              createMany: jest.fn(),
              findMany: jest.fn(),
            },
            userStats: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            userWallet: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            rewardLedgerEntry: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            missionProgress: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: StatsService,
          useValue: {
            getDashboardForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('saveOrUpdateScoredSession - Step 5.1 fields', () => {
    it('should populate turnIndex for all messages', async () => {
      const transcript = [
        { role: 'USER', content: 'Hello' },
        { role: 'AI', content: 'Hi there' },
        { role: 'USER', content: 'How are you?' },
      ];

      const mockTransaction = jest.fn(async (callback) => {
        return callback({
          userStats: { findUnique: jest.fn().mockResolvedValue({ sessionsCount: 0, successCount: 0, failCount: 0, averageScore: 0, averageMessageScore: 0 }) },
          userWallet: { findUnique: jest.fn().mockResolvedValue({ xp: 0, coins: 0, gems: 0, lifetimeXp: 0 }) },
          practiceSession: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'session-1' }),
          },
          chatMessage: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          rewardLedgerEntry: { findUnique: jest.fn().mockResolvedValue(null) },
          userStats: { update: jest.fn() },
          userWallet: { update: jest.fn() },
          missionProgress: { findUnique: jest.fn().mockResolvedValue(null) },
        });
      });

      (prisma.$transaction as jest.Mock) = mockTransaction;

      await service['saveOrUpdateScoredSession']({
        userId: 'user-1',
        topic: 'Test',
        messageScores: [75, 85],
        transcript,
        aiCoreResult: null,
      });

      const createManyCall = mockTransaction.mock.calls[0][0]().then(() => {
        const chatMessageMock = (prisma.$transaction as jest.Mock).mock.calls[0][0]().chatMessage;
        expect(chatMessageMock.createMany).toHaveBeenCalled();
        const createManyArgs = chatMessageMock.createMany.mock.calls[0][0];
        expect(createManyArgs.data[0].turnIndex).toBe(0);
        expect(createManyArgs.data[1].turnIndex).toBe(1);
        expect(createManyArgs.data[2].turnIndex).toBe(2);
      });
    });

    it('should populate score for USER messages', async () => {
      const transcript = [
        { role: 'USER', content: 'Hello' },
        { role: 'AI', content: 'Hi there' },
      ];

      const mockTransaction = jest.fn(async (callback) => {
        return callback({
          userStats: { findUnique: jest.fn().mockResolvedValue({ sessionsCount: 0, successCount: 0, failCount: 0, averageScore: 0, averageMessageScore: 0 }) },
          userWallet: { findUnique: jest.fn().mockResolvedValue({ xp: 0, coins: 0, gems: 0, lifetimeXp: 0 }) },
          practiceSession: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'session-1' }),
          },
          chatMessage: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          rewardLedgerEntry: { findUnique: jest.fn().mockResolvedValue(null) },
          userStats: { update: jest.fn() },
          userWallet: { update: jest.fn() },
          missionProgress: { findUnique: jest.fn().mockResolvedValue(null) },
        });
      });

      (prisma.$transaction as jest.Mock) = mockTransaction;

      await service['saveOrUpdateScoredSession']({
        userId: 'user-1',
        topic: 'Test',
        messageScores: [75],
        transcript,
        aiCoreResult: null,
      });

      const createManyCall = mockTransaction.mock.calls[0][0]().then(() => {
        const chatMessageMock = (prisma.$transaction as jest.Mock).mock.calls[0][0]().chatMessage;
        expect(chatMessageMock.createMany).toHaveBeenCalled();
        const createManyArgs = chatMessageMock.createMany.mock.calls[0][0];
        expect(createManyArgs.data[0].score).toBe(75); // USER message
        expect(createManyArgs.data[1].score).toBeNull(); // AI message
      });
    });

    it('should populate traitData when aiCoreResult provided', async () => {
      const transcript = [
        { role: 'USER', content: 'Hello' },
        { role: 'AI', content: 'Hi there' },
      ];

      const aiCoreResult: AiSessionResult = {
        version: 'v1',
        metrics: {
          charismaIndex: 75,
          overallScore: 75,
          confidence: 80,
          clarity: 70,
          humor: 60,
          tensionControl: 70,
          emotionalWarmth: 75,
          dominance: 70,
          fillerWordsCount: 0,
          totalMessages: 1,
          totalWords: 5,
        },
        messages: [
          {
            text: 'Hello',
            sentBy: 'user',
            traits: {
              confidence: 80,
              clarity: 70,
              humor: 60,
              tensionControl: 70,
              emotionalWarmth: 75,
              dominance: 70,
            },
            label: 'good',
            flags: ['positive'],
          },
          {
            text: 'Hi there',
            sentBy: 'ai',
            traits: {
              confidence: 50,
              clarity: 60,
              humor: 50,
              tensionControl: 50,
              emotionalWarmth: 50,
              dominance: 50,
            },
            label: 'neutral',
            flags: [],
          },
        ],
      };

      const mockTransaction = jest.fn(async (callback) => {
        return callback({
          userStats: { findUnique: jest.fn().mockResolvedValue({ sessionsCount: 0, successCount: 0, failCount: 0, averageScore: 0, averageMessageScore: 0 }) },
          userWallet: { findUnique: jest.fn().mockResolvedValue({ xp: 0, coins: 0, gems: 0, lifetimeXp: 0 }) },
          practiceSession: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'session-1' }),
          },
          chatMessage: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          rewardLedgerEntry: { findUnique: jest.fn().mockResolvedValue(null) },
          userStats: { update: jest.fn() },
          userWallet: { update: jest.fn() },
          missionProgress: { findUnique: jest.fn().mockResolvedValue(null) },
        });
      });

      (prisma.$transaction as jest.Mock) = mockTransaction;

      await service['saveOrUpdateScoredSession']({
        userId: 'user-1',
        topic: 'Test',
        messageScores: [75],
        transcript,
        aiCoreResult,
      });

      const createManyCall = mockTransaction.mock.calls[0][0]().then(() => {
        const chatMessageMock = (prisma.$transaction as jest.Mock).mock.calls[0][0]().chatMessage;
        expect(chatMessageMock.createMany).toHaveBeenCalled();
        const createManyArgs = chatMessageMock.createMany.mock.calls[0][0];
        expect(createManyArgs.data[0].traitData).toBeDefined();
        expect(createManyArgs.data[0].traitData.traits).toEqual(aiCoreResult.messages[0].traits);
        expect(createManyArgs.data[0].traitData.flags).toEqual(['positive']);
        expect(createManyArgs.data[1].traitData).toBeDefined();
        expect(createManyArgs.data[1].traitData.traits).toEqual(aiCoreResult.messages[1].traits);
      });
    });

    it('should populate endReasonCode and endReasonMeta in PracticeSession', async () => {
      const transcript = [{ role: 'USER', content: 'Hello' }];

      const mockTransaction = jest.fn(async (callback) => {
        return callback({
          userStats: { findUnique: jest.fn().mockResolvedValue({ sessionsCount: 0, successCount: 0, failCount: 0, averageScore: 0, averageMessageScore: 0 }) },
          userWallet: { findUnique: jest.fn().mockResolvedValue({ xp: 0, coins: 0, gems: 0, lifetimeXp: 0 }) },
          practiceSession: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'session-1' }),
          },
          chatMessage: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          rewardLedgerEntry: { findUnique: jest.fn().mockResolvedValue(null) },
          userStats: { update: jest.fn() },
          userWallet: { update: jest.fn() },
          missionProgress: { findUnique: jest.fn().mockResolvedValue(null) },
        });
      });

      (prisma.$transaction as jest.Mock) = mockTransaction;

      await service['saveOrUpdateScoredSession']({
        userId: 'user-1',
        topic: 'Test',
        messageScores: [75],
        transcript,
        missionStatus: 'SUCCESS',
        endReasonCode: 'SUCCESS_OBJECTIVE',
        endReasonMeta: { averageScore: 75 },
        aiCoreResult: null,
      });

      const sessionCreateCall = mockTransaction.mock.calls[0][0]().then(() => {
        const sessionMock = (prisma.$transaction as jest.Mock).mock.calls[0][0]().practiceSession;
        expect(sessionMock.create).toHaveBeenCalled();
        const createArgs = sessionMock.create.mock.calls[0][0];
        expect(createArgs.data.endReasonCode).toBe('SUCCESS_OBJECTIVE');
        expect(createArgs.data.endReasonMeta).toEqual({ averageScore: 75 });
      });
    });
  });
});

