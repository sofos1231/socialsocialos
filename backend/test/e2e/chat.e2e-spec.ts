// backend/test/e2e/chat.e2e-spec.ts
// Step 5.6 e2e tests for chat message allowlist serialization

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/db/prisma.service';
import { MessageRole } from '@prisma/client';

describe('Chat E2E - Step 5.6', () => {
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
    userId = 'test-user-id';
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 5.6 - Chat Message Allowlist Serialization', () => {
    const ALLOWED_MESSAGE_KEYS = ['turnIndex', 'role', 'content', 'score', 'traitData'];

    const FORBIDDEN_MESSAGE_KEYS = [
      'id',
      'sessionId',
      'userId',
      'createdAt',
      'updatedAt',
      'grade',
      'xpDelta',
      'coinsDelta',
      'gemsDelta',
      'isBrilliant',
      'isLifesaver',
      'meta',
    ];

    /**
     * Deep scan helper: recursively check for forbidden keys anywhere in the object
     */
    function deepScanForForbiddenKeys(obj: any, path: string = ''): string[] {
      const found: string[] = [];
      if (obj === null || obj === undefined) return found;

      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            found.push(...deepScanForForbiddenKeys(item, `${path}[${index}]`));
          });
        } else {
          Object.keys(obj).forEach((key) => {
            // Check if key itself is forbidden
            if (FORBIDDEN_MESSAGE_KEYS.includes(key)) {
              found.push(`${path ? path + '.' : ''}${key}`);
            }
            // Recursively check nested objects
            found.push(...deepScanForForbiddenKeys(obj[key], `${path ? path + '.' : ''}${key}`));
          });
        }
      }

      return found;
    }

    it('should only return top-level "message" key', async () => {
      const session = await prisma.practiceSession.create({
        data: { userId, topic: 'Test Chat Allowlist', status: 'IN_PROGRESS' },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          content: 'Test message',
        })
        .expect(201);

      const topLevelKeys = Object.keys(response.body).sort();
      expect(topLevelKeys).toEqual(['message']);
    });

    it('should only return allowlisted message fields (5 fields only)', async () => {
      const session = await prisma.practiceSession.create({
        data: { userId, topic: 'Test Chat Allowlist', status: 'IN_PROGRESS' },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          content: 'Test message',
        })
        .expect(201);

      expect(response.body.message).toBeDefined();
      const messageKeys = Object.keys(response.body.message).sort();
      const expectedKeys = [...ALLOWED_MESSAGE_KEYS].sort();

      expect(messageKeys).toEqual(expectedKeys);
    });

    it('should NOT contain forbidden internal fields', async () => {
      const session = await prisma.practiceSession.create({
        data: { userId, topic: 'Test Chat Forbidden Keys', status: 'IN_PROGRESS' },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          content: 'Test message',
        })
        .expect(201);

      FORBIDDEN_MESSAGE_KEYS.forEach((forbiddenKey) => {
        expect(response.body.message[forbiddenKey]).toBeUndefined();
      });
    });

    it('should NOT contain forbidden keys anywhere (deep scan)', async () => {
      const session = await prisma.practiceSession.create({
        data: { userId, topic: 'Test Chat Deep Scan', status: 'IN_PROGRESS' },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          content: 'Test message',
        })
        .expect(201);

      const forbiddenKeysFound = deepScanForForbiddenKeys(response.body);
      expect(forbiddenKeysFound).toEqual([]);
    });

    it('should have correct traitData structure', async () => {
      const session = await prisma.practiceSession.create({
        data: { userId, topic: 'Test Chat TraitData', status: 'IN_PROGRESS' },
      });

      const response = await request(app.getHttpServer())
        .post('/v1/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: session.id,
          content: 'Test message',
        })
        .expect(201);

      if (response.body.message.traitData) {
        const traitDataKeys = Object.keys(response.body.message.traitData).sort();
        expect(traitDataKeys).toEqual(['flags', 'label', 'traits']);
        expect(Array.isArray(response.body.message.traitData.flags)).toBe(true);
        expect(typeof response.body.message.traitData.label === 'string' || response.body.message.traitData.label === null).toBe(true);
        expect(typeof response.body.message.traitData.traits === 'object').toBe(true);
      }
    });

    // Cleanup helper
    afterEach(async () => {
      // Clean up test sessions and messages
      await prisma.chatMessage.deleteMany({ where: { userId } });
      await prisma.practiceSession.deleteMany({ where: { userId } });
    });
  });
});

