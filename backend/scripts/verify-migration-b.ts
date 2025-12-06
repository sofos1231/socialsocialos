// backend/scripts/verify-migration-b.ts
// Pre-migration verification for Step 5.1 Migration B
// Checks that all ChatMessage records have turnIndex and traitData populated

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigrationB() {
  console.log('========================================');
  console.log('Migration B Pre-Migration Verification');
  console.log('========================================\n');

  try {
    // Check 1: COUNT(*) WHERE turnIndex IS NULL = 0
    const nullTurnIndex = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM "ChatMessage"
      WHERE "turnIndex" IS NULL
    `;
    const turnIndexNullCount = Number(nullTurnIndex[0]?.count ?? 0);
    console.log(`✓ Check 1: turnIndex IS NULL count = ${turnIndexNullCount}`);
    if (turnIndexNullCount > 0) {
      console.error(`  ❌ FAILED: Found ${turnIndexNullCount} messages with null turnIndex`);
      process.exit(1);
    }

    // Check 2: COUNT(*) WHERE traitData IS NULL = 0
    const nullTraitData = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM "ChatMessage"
      WHERE "traitData" IS NULL
    `;
    const traitDataNullCount = Number(nullTraitData[0]?.count ?? 0);
    console.log(`✓ Check 2: traitData IS NULL count = ${traitDataNullCount}`);
    if (traitDataNullCount > 0) {
      console.error(`  ❌ FAILED: Found ${traitDataNullCount} messages with null traitData`);
      process.exit(1);
    }

    // Check 3: No duplicates for (sessionId, turnIndex)
    const duplicates = await prisma.$queryRaw<Array<{ sessionId: string; turnIndex: number; count: bigint }>>`
      SELECT "sessionId", "turnIndex", COUNT(*)::int as count
      FROM "ChatMessage"
      WHERE "turnIndex" IS NOT NULL
      GROUP BY "sessionId", "turnIndex"
      HAVING COUNT(*) > 1
    `;
    const duplicateCount = duplicates.length;
    console.log(`✓ Check 3: Duplicate (sessionId, turnIndex) pairs = ${duplicateCount}`);
    if (duplicateCount > 0) {
      console.error(`  ❌ FAILED: Found ${duplicateCount} duplicate (sessionId, turnIndex) pairs:`);
      duplicates.forEach((dup) => {
        console.error(`    - sessionId: ${dup.sessionId}, turnIndex: ${dup.turnIndex}, count: ${dup.count}`);
      });
      process.exit(1);
    }

    console.log('\n========================================');
    console.log('✅ All checks passed! Ready for Migration B');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigrationB();

