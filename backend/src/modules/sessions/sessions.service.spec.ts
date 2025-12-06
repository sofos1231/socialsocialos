// backend/src/modules/sessions/sessions.service.spec.ts
// Step 5.1 tests for sessions.service.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../db/prisma.service';
import { SessionsService } from './sessions.service';
// ✅ Step 5.5: Import from shared normalizer module
import { normalizeChatMessageRead } from '../shared/normalizers/chat-message.normalizer';
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
            findMany: jest.fn().mockResolvedValue([]),
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
            findMany: jest.fn().mockResolvedValue([]),
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
            findMany: jest.fn().mockResolvedValue([]),
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
            findMany: jest.fn().mockResolvedValue([]),
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

  describe('Step 5.4: normalizeChatMessageRead', () => {
    describe('turnIndex normalization', () => {
      it('should use valid turnIndex from message', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 5, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          10,
        );
        expect(result.turnIndex).toBe(5);
      });

      it('should truncate non-integer turnIndex', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 5.7, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          10,
        );
        expect(result.turnIndex).toBe(5);
      });

      it('should use fallbackIndex when turnIndex is missing', () => {
        const result = normalizeChatMessageRead(
          { role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          3,
        );
        expect(result.turnIndex).toBe(3);
      });

      it('should use fallbackIndex when turnIndex is undefined', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: undefined, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          7,
        );
        expect(result.turnIndex).toBe(7);
      });

      it('should use fallbackIndex when turnIndex is null', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: null, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          2,
        );
        expect(result.turnIndex).toBe(2);
      });

      it('should use fallbackIndex when turnIndex is NaN', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: NaN, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          4,
        );
        expect(result.turnIndex).toBe(4);
      });

      it('should use fallbackIndex when turnIndex is Infinity', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: Infinity, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          1,
        );
        expect(result.turnIndex).toBe(1);
      });

      it('should use fallbackIndex when turnIndex is negative', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: -1, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          0,
        );
        expect(result.turnIndex).toBe(0);
      });

      it('should truncate fallbackIndex if non-integer', () => {
        const result = normalizeChatMessageRead(
          { role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          9.8,
        );
        expect(result.turnIndex).toBe(9);
      });
    });

    describe('score normalization', () => {
      it('should return valid score within range', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 75, traitData: {} },
          0,
        );
        expect(result.score).toBe(75);
      });

      it('should truncate non-integer score', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 75.7, traitData: {} },
          0,
        );
        expect(result.score).toBe(75);
      });

      it('should return null when score is undefined', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: undefined, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return null when score is null', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return null when score is NaN', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: NaN, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return null when score is Infinity', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: Infinity, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return null when score is -Infinity', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: -Infinity, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return null when score is -1 (out of range)', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: -1, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return null when score is 101 (out of range)', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 101, traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });

      it('should return 0 when score is exactly 0', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 0, traitData: {} },
          0,
        );
        expect(result.score).toBe(0);
      });

      it('should return 100 when score is exactly 100', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 100, traitData: {} },
          0,
        );
        expect(result.score).toBe(100);
      });

      it('should return null when score is not a number', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: '75', traitData: {} },
          0,
        );
        expect(result.score).toBeNull();
      });
    });

    describe('traitData normalization', () => {
      it('should apply normalizeTraitData', () => {
        const result = normalizeChatMessageRead(
          {
            turnIndex: 0,
            role: MessageRole.USER,
            content: 'test',
            score: null,
            traitData: { traits: { key: 'value' }, flags: ['flag1'], label: 'test' },
          },
          0,
        );
        expect(result.traitData).toEqual({
          traits: { key: 'value' },
          flags: ['flag1'],
          label: 'test',
        });
      });

      it('should handle null traitData', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'test', score: null, traitData: null },
          0,
        );
        expect(result.traitData).toEqual({
          traits: {},
          flags: [],
          label: null,
        });
      });
    });

    describe('content normalization', () => {
      it('should preserve valid string content', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 'Hello world', score: null, traitData: {} },
          0,
        );
        expect(result.content).toBe('Hello world');
      });

      it('should handle null content', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: null, score: null, traitData: {} },
          0,
        );
        expect(result.content).toBe('');
      });

      it('should handle undefined content', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: undefined, score: null, traitData: {} },
          0,
        );
        expect(result.content).toBe('');
      });

      it('should handle non-string content', () => {
        const result = normalizeChatMessageRead(
          { turnIndex: 0, role: MessageRole.USER, content: 123, score: null, traitData: {} },
          0,
        );
        expect(result.content).toBe('');
      });
    });

    describe('idempotency', () => {
      it('should be idempotent - applying twice yields same result', () => {
        const input = {
          turnIndex: 5,
          role: MessageRole.USER,
          content: 'test',
          score: 75,
          traitData: { traits: { key: 'value' }, flags: ['flag'], label: 'label' },
        };

        const first = normalizeChatMessageRead(input, 0);
        const second = normalizeChatMessageRead(first, first.turnIndex);

        expect(second.turnIndex).toBe(first.turnIndex);
        expect(second.score).toBe(first.score);
        expect(second.content).toBe(first.content);
        expect(second.traitData).toEqual(first.traitData);
      });

      it('should be idempotent with null score', () => {
        const input = {
          turnIndex: 3,
          role: MessageRole.AI,
          content: 'reply',
          score: null,
          traitData: {},
        };

        const first = normalizeChatMessageRead(input, 0);
        const second = normalizeChatMessageRead(first, first.turnIndex);

        expect(second.turnIndex).toBe(first.turnIndex);
        expect(second.score).toBeNull();
        expect(second.score).toBe(first.score);
      });
    });
  });
});

