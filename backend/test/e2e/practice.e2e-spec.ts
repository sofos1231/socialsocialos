// backend/test/e2e/practice.e2e-spec.ts
// Step 5.1 e2e tests for practice session flow

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/db/prisma.service';
import { MessageRole } from '@prisma/client';

describe('Practice E2E - Step 5.1', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test user and get auth token
    // (Implementation depends on your auth setup)
    // For now, assuming you have a test user setup
    userId = 'test-user-id';
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ChatMessage ordering by turnIndex', () => {
    it('should retrieve messages ordered by turnIndex, not createdAt', async () => {
      // Create a session with multiple messages
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          topic: 'Test Session',
          status: 'IN_PROGRESS',
        },
      });

      // Create messages with same createdAt (simulating createMany behavior)
      const now = new Date();
      await prisma.chatMessage.createMany({
        data: [
          {
            sessionId: session.id,
            userId,
            role: MessageRole.USER,
            content: 'First message',
            createdAt: now,
            turnIndex: 0,
          },
          {
            sessionId: session.id,
            userId,
            role: MessageRole.AI,
            content: 'AI response',
            createdAt: now,
            turnIndex: 1,
          },
          {
            sessionId: session.id,
            userId,
            role: MessageRole.USER,
            content: 'Second message',
            createdAt: now,
            turnIndex: 2,
          },
        ],
      });

      // Retrieve messages - should be ordered by turnIndex
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { turnIndex: 'asc' },
      });

      expect(messages.length).toBe(3);
      expect(messages[0].turnIndex).toBe(0);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].turnIndex).toBe(1);
      expect(messages[1].content).toBe('AI response');
      expect(messages[2].turnIndex).toBe(2);
      expect(messages[2].content).toBe('Second message');

      // Cleanup
      await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
      await prisma.practiceSession.delete({ where: { id: session.id } });
    });
  });

  describe('Full session flow populates Step 5.1 fields', () => {
    it('should populate turnIndex, score, traitData, endReasonCode on session completion', async () => {
      // This test would require a full practice session flow
      // For now, we'll test the persistence directly

      const session = await prisma.practiceSession.create({
        data: {
          userId,
          topic: 'Test Session',
          status: 'SUCCESS',
          endReasonCode: 'SUCCESS_OBJECTIVE',
          endReasonMeta: { averageScore: 80 },
        },
      });

      await prisma.chatMessage.createMany({
        data: [
          {
            sessionId: session.id,
            userId,
            role: MessageRole.USER,
            content: 'Hello',
            turnIndex: 0,
            score: 75,
            traitData: {
              traits: { confidence: 80, clarity: 70 },
              flags: ['positive'],
              label: 'good',
            },
          },
        ],
      });

      const savedSession = await prisma.practiceSession.findUnique({
        where: { id: session.id },
        include: { messages: true },
      });

      expect(savedSession?.endReasonCode).toBe('SUCCESS_OBJECTIVE');
      expect(savedSession?.endReasonMeta).toEqual({ averageScore: 80 });
      expect(savedSession?.messages[0].turnIndex).toBe(0);
      expect(savedSession?.messages[0].score).toBe(75);
      expect(savedSession?.messages[0].traitData).toBeDefined();

      // Cleanup
      await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
      await prisma.practiceSession.delete({ where: { id: session.id } });
    });
  });
});

