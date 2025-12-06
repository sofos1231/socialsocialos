/// <reference types="node" />
// backend/scripts/backfill-step5-1.ts
// Step 5.1 Backfill Script
// Populates turnIndex, score, traitData on ChatMessage
// and endReasonCode/endReasonMeta on PracticeSession.
//
// NOTE: Prisma Json nullable fields cannot be filtered with `field: null`.
// Use Prisma.DbNull / Prisma.JsonNull instead.

import { PrismaClient, Prisma, MessageRole } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

function isObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readMetaIndex(meta: unknown): number | null {
  if (!isObject(meta)) return null;
  return typeof meta.index === 'number' && Number.isFinite(meta.index)
    ? meta.index
    : null;
}

function readMetaScore(meta: unknown): number | null {
  if (!isObject(meta)) return null;
  return typeof meta.score === 'number' && Number.isFinite(meta.score)
    ? meta.score
    : null;
}

async function backfillChatMessages(): Promise<number> {
  console.log('Starting ChatMessage backfill...');
  console.log('  - turnIndex from meta.index');
  console.log('  - score from meta.score (USER messages only)');
  console.log('  - traitData from session.aiCorePayload.messages[turnIndex]');
  console.log('');

  let cursorId: string | null = null;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  while (true) {
    const whereClause: Prisma.ChatMessageWhereInput = {
      OR: [
        { turnIndex: null },
        { AND: [{ role: MessageRole.USER }, { score: null }] },
        { traitData: { equals: Prisma.DbNull } },
        { traitData: { equals: Prisma.JsonNull } },
      ],
    };

    if (cursorId) (whereClause as any).id = { gt: cursorId };

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
      include: {
        session: { select: { id: true, aiCorePayload: true } },
      },
    });

    if (messages.length === 0) break;

    console.log(`Processing batch (${messages.length} messages)...`);

    let batchUpdated = 0;
    let batchSkipped = 0;

    for (const msg of messages) {
      const updates: Prisma.ChatMessageUpdateInput = {};
      let hasUpdates = false;

      let turnIndex: number | null =
        typeof (msg as any).turnIndex === 'number' ? (msg as any).turnIndex : null;

      if (turnIndex === null) {
        const idx = readMetaIndex(msg.meta as any);
        if (idx === null) {
          console.log(`  ⚠️  Skipping message ${msg.id}: meta.index missing`);
          batchSkipped++;
          totalSkipped++;
          cursorId = msg.id;
          continue;
        }
        turnIndex = idx;
        (updates as any).turnIndex = idx;
        hasUpdates = true;
      }

      if (msg.role === MessageRole.USER && (msg as any).score === null) {
        const s = readMetaScore(msg.meta as any);
        if (s !== null) {
          (updates as any).score = s;
          hasUpdates = true;
        }
      }

      const traitDataIsNullLike =
        msg.traitData === null ||
        (msg.traitData as any) === Prisma.DbNull ||
        (msg.traitData as any) === Prisma.JsonNull;

      if (traitDataIsNullLike && msg.session?.aiCorePayload) {
        const aiCorePayload = msg.session.aiCorePayload as any;
        if (isObject(aiCorePayload) && Array.isArray(aiCorePayload.messages)) {
          const evalAtIndex = aiCorePayload.messages[turnIndex];
          if (isObject(evalAtIndex) && isObject(evalAtIndex.traits)) {
            const flags = Array.isArray(evalAtIndex.flags) ? evalAtIndex.flags : [];
            (updates as any).traitData = {
              traits: evalAtIndex.traits,
              flags,
              label: typeof evalAtIndex.label === 'string' ? evalAtIndex.label : null,
            };
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        await prisma.chatMessage.update({ where: { id: msg.id }, data: updates });
        batchUpdated++;
        totalUpdated++;
      }

      cursorId = msg.id;
    }

    totalProcessed += messages.length;
    console.log(
      `  Updated ${batchUpdated} messages, skipped ${batchSkipped} (${totalUpdated} total updated, ${totalSkipped} total skipped)`,
    );
  }

  console.log(`\nChatMessage backfill complete:`);
  console.log(`  - Processed: ${totalProcessed}`);
  console.log(`  - Updated: ${totalUpdated}`);
  console.log(`  - Skipped: ${totalSkipped}`);
  console.log('');

  return totalProcessed;
}

async function backfillPracticeSessions(): Promise<number> {
  console.log('Starting PracticeSession backfill...');
  console.log('  - endReasonCode from payload.endReasonCode');
  console.log('  - endReasonMeta from payload.endReasonMeta');
  console.log('');

  let cursorId: string | null = null;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (true) {
    const whereClause: Prisma.PracticeSessionWhereInput = {
      payload: { not: Prisma.DbNull },
      OR: [
        { endReasonCode: null },
        { endReasonMeta: { equals: Prisma.DbNull } },
        { endReasonMeta: { equals: Prisma.JsonNull } },
      ],
    };

    if (cursorId) (whereClause as any).id = { gt: cursorId };

    const sessions = await prisma.practiceSession.findMany({
      where: whereClause,
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
      select: { id: true, payload: true, endReasonCode: true, endReasonMeta: true },
    });

    if (sessions.length === 0) break;

    console.log(`Processing batch (${sessions.length} sessions)...`);

    let batchUpdated = 0;

    for (const session of sessions) {
      const updates: Prisma.PracticeSessionUpdateInput = {};
      let hasUpdates = false;

      const payload = session.payload as any;
      if (!isObject(payload)) {
        cursorId = session.id;
        continue;
      }

      if (session.endReasonCode === null && typeof payload.endReasonCode === 'string') {
        (updates as any).endReasonCode = payload.endReasonCode;
        hasUpdates = true;
      }

      const endReasonMetaIsNullLike =
        session.endReasonMeta === null ||
        (session.endReasonMeta as any) === Prisma.DbNull ||
        (session.endReasonMeta as any) === Prisma.JsonNull;

      if (
        endReasonMetaIsNullLike &&
        payload.endReasonMeta &&
        typeof payload.endReasonMeta === 'object'
      ) {
        (updates as any).endReasonMeta = payload.endReasonMeta;
        hasUpdates = true;
      }

      if (hasUpdates) {
        await prisma.practiceSession.update({ where: { id: session.id }, data: updates });
        batchUpdated++;
        totalUpdated++;
      }

      cursorId = session.id;
    }

    totalProcessed += sessions.length;
    console.log(`  Updated ${batchUpdated} sessions (${totalUpdated} total)`);
  }

  console.log(`\nPracticeSession backfill complete:`);
  console.log(`  - Processed: ${totalProcessed}`);
  console.log(`  - Updated: ${totalUpdated}`);
  console.log('');

  return totalProcessed;
}

async function main() {
  try {
    console.log('========================================');
    console.log('Step 5.1 Backfill Script');
    console.log('========================================\n');

    const chatMessagesProcessed = await backfillChatMessages();
    const sessionsProcessed = await backfillPracticeSessions();

    console.log('========================================');
    console.log('✅ Backfill complete!');
    console.log('========================================');
    console.log(`ChatMessages processed: ${chatMessagesProcessed}`);
    console.log(`Sessions processed: ${sessionsProcessed}`);
    console.log('\nNext step: Verify null counts, then consider Migration B.');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
