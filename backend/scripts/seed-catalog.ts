import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG = [
  { key: 'xp_boost_2x_24h', type: 'powerup', pricing: { coins: 50 } },
  { key: 'confidence_booster_next', type: 'powerup', pricing: { coins: 75 } },
  { key: 'retry_token', type: 'powerup', pricing: { coins: 30 } },
  { key: 'instant_unlock', type: 'powerup', pricing: { diamonds: 2 } },
  { key: 'premium_scenarios', type: 'feature', pricing: { diamonds: 3 } },
  { key: 'ai_coach_boost_7d', type: 'feature', pricing: { diamonds: 5 }, bonus: { durationDays: 7 } },
  { key: 'coins_300', type: 'coinpack', pricing: { price: 9.99, currency: 'USD', coins: 300 } },
  { key: 'coins_750', type: 'coinpack', pricing: { price: 19.99, currency: 'USD', coins: 750 } },
  { key: 'coins_1500', type: 'coinpack', pricing: { price: 34.99, currency: 'USD', coins: 1500 } },
  { key: 'd_5', type: 'diamondpack', pricing: { price: 2.99, currency: 'USD', diamonds: 5 } },
  { key: 'd_15', type: 'diamondpack', pricing: { price: 7.99, currency: 'USD', diamonds: 15 } },
  { key: 'd_40', type: 'diamondpack', pricing: { price: 14.99, currency: 'USD', diamonds: 40 } },
  { key: 'd_100', type: 'diamondpack', pricing: { price: 24.99, currency: 'USD', diamonds: 100 } },
];

async function main() {
  for (const item of CATALOG) {
    await prisma.shopCatalog.upsert({
      where: { key: item.key },
      update: { type: item.type, pricing: item.pricing as any, bonus: (item as any).bonus ?? undefined, active: true },
      create: { key: item.key, type: item.type, pricing: item.pricing as any, bonus: (item as any).bonus ?? undefined, active: true },
    });
  }
  console.log('Catalog seeded.');
}

main().finally(async () => {
  await prisma.$disconnect();
});


