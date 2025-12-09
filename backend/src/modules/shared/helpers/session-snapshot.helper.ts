// backend/src/modules/shared/helpers/session-snapshot.helper.ts
// Step 5.1: Shared session snapshot helper for analytics engines
// Single source of truth for loading session data used by mood/gates/traits/prompts services

import { PrismaService } from '../../../db/prisma.service';
import { MissionStatus } from '@prisma/client';
import { normalizeTraitData } from '../normalizers/chat-message.normalizer';

/**
 * Session analytics snapshot - normalized session data for analytics engines
 */
export interface SessionAnalyticsSnapshot {
  session: {
    id: string;
    userId: string;
    templateId: string | null;
    status: MissionStatus;
    endReasonCode: string | null;
    endReasonMeta: any;
    payload: any;
    createdAt: Date;
  };
  userId: string;
  templateId: string | null;
  messages: Array<{
    id: string;
    turnIndex: number;
    role: 'USER' | 'AI' | 'SYSTEM';
    content: string;
    score: number | null;
    traitData: {
      traits: Record<string, number>;
      flags: string[];
      label: string | null;
      hooks: string[];
      patterns: string[];
    };
  }>;
  endReasonCode: string | null;
  endReasonMeta: any;
  // TODO: normalizedMissionConfigV1 if that pattern exists
  // For now, payload is available in session.payload
}

/**
 * Loads a complete session snapshot for analytics processing
 * Used by mood/gates/traits/prompts services to avoid query duplication
 * 
 * @param prisma - PrismaService instance
 * @param sessionId - Session ID to load
 * @returns SessionAnalyticsSnapshot with normalized data
 * @throws Error if session not found or not finalized
 */
export async function loadSessionAnalyticsSnapshot(
  prisma: PrismaService,
  sessionId: string,
): Promise<SessionAnalyticsSnapshot> {
  // Load session with messages ordered by turnIndex
  const session = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { turnIndex: 'asc' },
      },
    },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Check if session is finalized (required for analytics)
  const isFinalized =
    session.status === MissionStatus.SUCCESS ||
    session.status === MissionStatus.FAIL ||
    session.status === MissionStatus.ABORTED;

  if (!isFinalized) {
    throw new Error(
      `Session ${sessionId} is not finalized (status: ${session.status}). Analytics can only run on finalized sessions.`,
    );
  }

  // Normalize messages with traitData
  const normalizedMessages = session.messages.map((msg) => {
    const normalizedTraitData = normalizeTraitData(msg.traitData);
    return {
      id: msg.id,
      turnIndex: msg.turnIndex,
      role: msg.role as 'USER' | 'AI' | 'SYSTEM',
      content: msg.content,
      score: msg.score,
      traitData: normalizedTraitData,
    };
  });

  return {
    session: {
      id: session.id,
      userId: session.userId,
      templateId: session.templateId,
      status: session.status,
      endReasonCode: session.endReasonCode,
      endReasonMeta: session.endReasonMeta,
      payload: session.payload,
      createdAt: session.createdAt,
    },
    userId: session.userId,
    templateId: session.templateId,
    messages: normalizedMessages,
    endReasonCode: session.endReasonCode,
    endReasonMeta: session.endReasonMeta,
  };
}

