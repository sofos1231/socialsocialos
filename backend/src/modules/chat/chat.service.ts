// backend/src/modules/chat/chat.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';
// ✅ Step 5.5: Import from shared normalizer (removed service-to-service dependency)
import { normalizeChatMessageRead } from '../shared/normalizers/chat-message.normalizer';

/**
 * ✅ Step 5.1 Migration B: Safe traitData helper
 * Returns a valid JsonObject for traitData, never null/undefined.
 * Consistent shape with sessions.service.ts writes.
 */
function safeTraitData(): Prisma.JsonObject {
  return { traits: {}, flags: [], label: null };
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async handleUserMessage(userId: string, sessionId: string, content: string) {
    const text = (content ?? '').trim();
    if (!userId || !sessionId) {
      throw new BadRequestException({
        code: 'CHAT_BAD_REQUEST',
        message: 'Missing userId or sessionId',
      });
    }
    if (!text) {
      throw new BadRequestException({
        code: 'CHAT_EMPTY_MESSAGE',
        message: 'Message content is empty',
      });
    }

    // ✅ Step 5.1 Migration B: Transaction-wrapped turnIndex calculation + create
    // After Migration B, @@unique([sessionId, turnIndex]) prevents duplicates
    const createMessage = async (retry = false): Promise<Prisma.ChatMessageGetPayload<{}>> => {
      return await this.prisma.$transaction(async (tx) => {
        // Get max turnIndex for this session
        const maxResult = await tx.chatMessage.aggregate({
          where: { sessionId },
          _max: { turnIndex: true },
        });

        const maxTurnIndex = maxResult._max.turnIndex;
        const turnIndex = (maxTurnIndex ?? -1) + 1;

        try {
          return await tx.chatMessage.create({
            data: {
              userId,
              sessionId,
              role: MessageRole.USER,
              content: text,
              turnIndex,
              traitData: safeTraitData(),
            },
          });
        } catch (error: any) {
          // ✅ Step 5.1 Migration B: Handle unique constraint violation (P2002)
          // Race condition: another message was created with same turnIndex between aggregate and create
          if (error?.code === 'P2002' && !retry) {
            // Retry once with recomputed max
            return createMessage(true);
          }
          throw error;
        }
      });
    };

    const message = await createMessage();

    // ✅ Step 5.4: Normalize returned message (preserve backwards compatibility)
    // Merge normalized fields with existing message fields in case callers rely on them
    const normalized = normalizeChatMessageRead(
      message,
      message.turnIndex ?? 0,
    );
    return {
      message: {
        ...message,
        ...normalized,
      },
    };
  }
}
