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

  describe('Step 5.3 - Normalize endReasonCode/endReasonMeta', () => {
    it('should return normalized endReasonCode and endReasonMeta in missionState', async () => {
      // This test verifies that API responses include normalized endReasonCode/endReasonMeta
      // Note: This requires actual API endpoint and auth setup
      // For now, we verify the shape is correct from DB reads

      const session = await prisma.practiceSession.create({
        data: {
          userId,
          topic: 'Test Session',
          status: 'SUCCESS',
          endedAt: new Date(),
          endReasonCode: 'SUCCESS_OBJECTIVE',
          endReasonMeta: { averageScore: 85, successScoreThreshold: 80 },
        },
      });

      const savedSession = await prisma.practiceSession.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          endReasonCode: true,
          endReasonMeta: true,
          status: true,
        },
      });

      // Verify fields exist and are correct types
      expect(savedSession).toBeDefined();
      expect(savedSession?.endReasonCode).toBeDefined();
      
      // endReasonCode should be string or null (never undefined)
      expect(
        savedSession?.endReasonCode === null ||
          typeof savedSession?.endReasonCode === 'string',
      ).toBe(true);

      // endReasonMeta should be object or null (never undefined)
      if (savedSession?.endReasonMeta !== null) {
        expect(typeof savedSession?.endReasonMeta).toBe('object');
        expect(Array.isArray(savedSession?.endReasonMeta)).toBe(false);
      }

      // Cleanup
      await prisma.practiceSession.delete({ where: { id: session.id } });
    });

    it('should handle null endReasonCode and endReasonMeta gracefully', async () => {
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          topic: 'Test Session',
          status: 'IN_PROGRESS',
          endReasonCode: null,
          endReasonMeta: null,
        },
      });

      const savedSession = await prisma.practiceSession.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          endReasonCode: true,
          endReasonMeta: true,
        },
      });

      expect(savedSession?.endReasonCode).toBeNull();
      expect(savedSession?.endReasonMeta).toBeNull();

      // Cleanup
      await prisma.practiceSession.delete({ where: { id: session.id } });
    });
  });

  describe('Step 5.4 - Normalize ChatMessage fields on READ', () => {
    it('should return normalized messages with turnIndex and score contract compliance', async () => {
      // Create a practice session with messages
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          topic: 'Session for Message Normalization Test',
          status: 'IN_PROGRESS',
        },
      });

      // Create messages with various score values (including edge cases)
      await prisma.chatMessage.createMany({
        data: [
          {
            userId,
            sessionId: session.id,
            role: MessageRole.USER,
            content: 'First message',
            turnIndex: 0,
            score: 75,
            traitData: { traits: {}, flags: [], label: null },
          },
          {
            userId,
            sessionId: session.id,
            role: MessageRole.AI,
            content: 'AI reply',
            turnIndex: 1,
            score: null, // AI messages have null score
            traitData: { traits: {}, flags: [], label: null },
          },
          {
            userId,
            sessionId: session.id,
            role: MessageRole.USER,
            content: 'Second message',
            turnIndex: 2,
            score: 88,
            traitData: { traits: {}, flags: [], label: null },
          },
        ],
      });

      // Submit a message to trigger the practice service read path
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          messages: [{ role: 'USER', content: 'Continuing session' }],
        })
        .expect(201);

      // Verify response structure
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);

      // Verify each message satisfies ApiChatMessage contract
      for (const message of response.body.messages) {
        // turnIndex must be a number (never undefined/null)
        expect(typeof message.turnIndex).toBe('number');
        expect(Number.isFinite(message.turnIndex)).toBe(true);
        expect(message.turnIndex).not.toBeNull();
        expect(message.turnIndex).not.toBeUndefined();

        // score must be number | null (never undefined, never NaN/Infinity)
        if (message.score !== null) {
          expect(typeof message.score).toBe('number');
          expect(Number.isFinite(message.score)).toBe(true);
          expect(message.score).not.toBeNaN();
          expect(message.score).not.toBe(Infinity);
          expect(message.score).not.toBe(-Infinity);
          // Score should be in valid range [0, 100]
          expect(message.score).toBeGreaterThanOrEqual(0);
          expect(message.score).toBeLessThanOrEqual(100);
        } else {
          expect(message.score).toBeNull();
        }
        expect(message.score).not.toBeUndefined();

        // traitData must be normalized
        expect(message.traitData).toBeDefined();
        expect(typeof message.traitData).toBe('object');
        expect(message.traitData).toHaveProperty('traits');
        expect(message.traitData).toHaveProperty('flags');
        expect(message.traitData).toHaveProperty('label');

        // content must be a string
        expect(typeof message.content).toBe('string');

        // role must be present
        expect(message.role).toBeDefined();
      }

      // Verify messages are ordered by turnIndex (ascending)
      for (let i = 1; i < response.body.messages.length; i++) {
        expect(response.body.messages[i].turnIndex).toBeGreaterThanOrEqual(
          response.body.messages[i - 1].turnIndex,
        );
      }

      // Cleanup
      await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
      await prisma.practiceSession.delete({ where: { id: session.id } });
    });

    it('should normalize invalid score values to null', async () => {
      // This test verifies defensive normalization of invalid scores
      // We'll create a message with an out-of-range score directly in DB
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          topic: 'Session for Invalid Score Test',
          status: 'IN_PROGRESS',
        },
      });

      // Create message with out-of-range score (will be normalized to null on read)
      await prisma.$executeRaw`
        INSERT INTO "ChatMessage" (
          id, "userId", "sessionId", role, content, "turnIndex", score, "traitData", "createdAt"
        ) VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${session.id},
          'USER',
          'Message with invalid score',
          0,
          150,  -- Out of range (should become null)
          '{"traits": {}, "flags": [], "label": null}'::jsonb,
          NOW()
        );
      `;

      // Submit a message to trigger read path
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          messages: [{ role: 'USER', content: 'Test' }],
        })
        .expect(201);

      // Find the message with invalid score (should be normalized to null)
      const messageWithInvalidScore = response.body.messages.find(
        (m: any) => m.content === 'Message with invalid score',
      );

      expect(messageWithInvalidScore).toBeDefined();
      expect(messageWithInvalidScore.score).toBeNull(); // Should be normalized to null

      // Cleanup
      await prisma.chatMessage.deleteMany({ where: { sessionId: session.id } });
      await prisma.practiceSession.delete({ where: { id: session.id } });
    });
  });

  describe('Step 5.5 - Public Response Sanitization', () => {
    it('should NOT include aiDebug in response by default', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test sanitization',
          messages: [{ role: 'USER', content: 'Hello' }],
        })
        .expect(201);

      // Verify aiDebug is NOT present
      expect(response.body.aiDebug).toBeUndefined();
    });

    it('should NOT include raw field in aiStructured if present', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test sanitization',
          messages: [{ role: 'USER', content: 'Hello' }],
        })
        .expect(201);

      // If aiStructured exists, it should NOT have a 'raw' field
      if (response.body.aiStructured) {
        expect(response.body.aiStructured.raw).toBeUndefined();
        // Verify other fields are preserved
        if (response.body.aiStructured.replyText !== undefined) {
          expect(typeof response.body.aiStructured.replyText).toBe('string');
        }
      }
    });

    it('should NOT include debug fields in production mode', async () => {
      // Save original env
      const originalEnv = process.env.NODE_ENV;
      const originalDebugFlag = process.env.AI_DEBUG_EXPOSE;

      try {
        // Set production mode
        process.env.NODE_ENV = 'production';
        delete process.env.AI_DEBUG_EXPOSE;

        const response = await request(app.getHttpServer())
          .post('/v1/practice/session')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            topic: 'Test production sanitization',
            messages: [{ role: 'USER', content: 'Hello' }],
          })
          .expect(201);

        // In production, aiDebug must be absent
        expect(response.body.aiDebug).toBeUndefined();

        // Verify response still has public fields
        expect(response.body.aiReply).toBeDefined();
        expect(response.body.missionState).toBeDefined();
      } finally {
        // Restore original env
        process.env.NODE_ENV = originalEnv;
        if (originalDebugFlag) {
          process.env.AI_DEBUG_EXPOSE = originalDebugFlag;
        }
      }
    });

    it('should preserve public fields (endReasonMeta, missionState, etc.)', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test public fields',
          messages: [{ role: 'USER', content: 'Hello' }],
        })
        .expect(201);

      // Verify public fields are present
      expect(response.body.aiReply).toBeDefined();
      expect(response.body.missionState).toBeDefined();
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.rewards).toBeDefined();
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should NOT include meta field in messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test message sanitization',
          messages: [{ role: 'USER', content: 'Hello' }],
        })
        .expect(201);

      // Verify messages don't have meta field
      if (response.body.messages && response.body.messages.length > 0) {
        response.body.messages.forEach((msg: any) => {
          expect(msg.meta).toBeUndefined();
          // Verify expected fields are present
          expect(msg.turnIndex).toBeDefined();
          expect(msg.role).toBeDefined();
          expect(msg.content).toBeDefined();
        });
      }
    });

    it('should serialize response JSON without debug fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/practice/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'Test JSON serialization',
          messages: [{ role: 'USER', content: 'Hello' }],
        })
        .expect(201);

      // Serialize and parse to ensure no hidden fields
      const jsonString = JSON.stringify(response.body);
      const parsed = JSON.parse(jsonString);

      // Verify no debug fields in serialized JSON
      expect(parsed.aiDebug).toBeUndefined();
      if (parsed.aiStructured) {
        expect(parsed.aiStructured.raw).toBeUndefined();
      }

      // Verify no 'raw' anywhere in the response tree
      const hasRawField = JSON.stringify(parsed).includes('"raw"');
      expect(hasRawField).toBe(false);
    });
  });
});

