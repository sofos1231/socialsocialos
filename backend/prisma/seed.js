"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    const user = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
            email: 'test@example.com',
            passwordHash,
            sessionVersion: 1,
        },
    });
    await prisma.economyWallet.upsert({
        where: { userId: user.id },
        update: { coins: { increment: 100 }, diamonds: { increment: 5 } },
        create: { userId: user.id, coins: 100, diamonds: 5, tickets: 0 },
    });
    await prisma.entitlement.createMany({
        data: [
            { userId: user.id, key: 'premium_scenarios', active: true, startsAt: new Date(), source: 'seed' },
            { userId: user.id, key: 'ai_coach_boost_7d', active: true, startsAt: new Date(), source: 'seed' },
        ],
        skipDuplicates: true,
    });
    console.log({ userId: user.id, seeded: true });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map