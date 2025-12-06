// backend/scripts/apply-migration-b.ts
// Apply Migration B SQL directly

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigrationB() {
  console.log('Applying Migration B: ChatMessage constraints...\n');

  try {
    // Make turnIndex NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ChatMessage" ALTER COLUMN "turnIndex" SET NOT NULL;
    `);
    console.log('✓ Made turnIndex NOT NULL');

    // Make traitData NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ChatMessage" ALTER COLUMN "traitData" SET NOT NULL;
    `);
    console.log('✓ Made traitData NOT NULL');

    // Drop the non-unique index
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "ChatMessage_sessionId_turnIndex_idx";
    `);
    console.log('✓ Dropped non-unique index');

    // Create unique constraint
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "ChatMessage_sessionId_turnIndex_key" ON "ChatMessage"("sessionId", "turnIndex");
    `);
    console.log('✓ Created unique constraint on (sessionId, turnIndex)');

    console.log('\n✅ Migration B applied successfully!');
  } catch (error) {
    console.error('\n❌ Migration B failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrationB();

