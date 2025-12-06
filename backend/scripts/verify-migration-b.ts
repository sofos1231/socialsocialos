// backend/scripts/verify-migration-b.ts
// Post-migration verification for Step 5.1 Migration B
// Reports counts of turnIndex/traitData NULLs and duplicate (sessionId, turnIndex) pairs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigrationB() {
  console.log('========================================');
  console.log('Migration B Post-Migration Verification');
  console.log('========================================\n');

  try {
    // Check 1: COUNT(*) WHERE turnIndex IS NULL
    const nullTurnIndex = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM "ChatMessage"
      WHERE "turnIndex" IS NULL
    `;
    const turnIndexNullCount = Number(nullTurnIndex[0]?.count ?? 0);
    console.log(`turnIndex IS NULL count: ${turnIndexNullCount}`);

    // Check 2: COUNT(*) WHERE traitData IS NULL
    const nullTraitData = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM "ChatMessage"
      WHERE "traitData" IS NULL
    `;
    const traitDataNullCount = Number(nullTraitData[0]?.count ?? 0);
    console.log(`traitData IS NULL count: ${traitDataNullCount}`);

    // Check 3: Duplicate (sessionId, turnIndex) pairs
    const duplicates = await prisma.$queryRaw<Array<{ sessionId: string; turnIndex: number; count: bigint }>>`
      SELECT "sessionId", "turnIndex", COUNT(*)::int as count
      FROM "ChatMessage"
      WHERE "turnIndex" IS NOT NULL
      GROUP BY "sessionId", "turnIndex"
      HAVING COUNT(*) > 1
    `;
    const duplicateCount = duplicates.length;
    console.log(`Duplicate (sessionId, turnIndex) pairs: ${duplicateCount}`);
    if (duplicateCount > 0) {
      console.log('  Duplicate details:');
      duplicates.forEach((dup) => {
        console.log(`    - sessionId: ${dup.sessionId}, turnIndex: ${dup.turnIndex}, count: ${Number(dup.count)}`);
      });
    }

    console.log('\n========================================');
    if (turnIndexNullCount === 0 && traitDataNullCount === 0 && duplicateCount === 0) {
      console.log('✅ All checks passed! Migration B constraints are satisfied.');
    } else {
      console.log('⚠️  Some issues detected (see above).');
    }
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

