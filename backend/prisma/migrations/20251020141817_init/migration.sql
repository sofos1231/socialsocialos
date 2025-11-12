-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "streakCurrent" INTEGER NOT NULL DEFAULT 0,
    "streakLastActiveAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responseJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyWallet" (
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "tickets" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyWallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ShopCatalog" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pricing" JSONB NOT NULL,
    "bonus" JSONB,
    "limits" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopCatalog_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PowerupInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "charges" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PowerupInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "storeTxId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "meta" JSONB,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "props" JSONB,
    "ts" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricsWeekly" (
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "fillerPerMin" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "energy" TEXT,
    "sentiment" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricsWeekly_pkey" PRIMARY KEY ("userId","weekStart")
);

-- CreateTable
CREATE TABLE "LimitedDeal" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "rules" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LimitedDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_userId_route_key" ON "IdempotencyKey"("key", "userId", "route");

-- CreateIndex
CREATE INDEX "PowerupInventory_userId_type_idx" ON "PowerupInventory"("userId", "type");

-- CreateIndex
CREATE INDEX "Entitlement_userId_key_active_idx" ON "Entitlement"("userId", "key", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_storeTxId_key" ON "Purchase"("storeTxId");

-- CreateIndex
CREATE INDEX "Event_userId_ts_idx" ON "Event"("userId", "ts");

-- CreateIndex
CREATE INDEX "LimitedDeal_key_active_idx" ON "LimitedDeal"("key", "active");
