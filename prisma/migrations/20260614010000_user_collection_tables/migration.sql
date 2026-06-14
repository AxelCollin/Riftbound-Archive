-- CreateTable
CREATE TABLE "CollectionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionEntry_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardUserMeta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardUserMeta_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BinderOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'AUTO',
    "variant" TEXT,
    "quantity" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BinderOverride_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CollectionEntry_variant_idx" ON "CollectionEntry"("variant");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEntry_cardId_variant_key" ON "CollectionEntry"("cardId", "variant");

-- CreateIndex
CREATE INDEX "CollectionTransaction_cardId_idx" ON "CollectionTransaction"("cardId");

-- CreateIndex
CREATE INDEX "CollectionTransaction_variant_idx" ON "CollectionTransaction"("variant");

-- CreateIndex
CREATE INDEX "CollectionTransaction_type_idx" ON "CollectionTransaction"("type");

-- CreateIndex
CREATE INDEX "CollectionTransaction_createdAt_idx" ON "CollectionTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CardUserMeta_cardId_key" ON "CardUserMeta"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "BinderOverride_cardId_key" ON "BinderOverride"("cardId");

-- CreateIndex
CREATE INDEX "BinderOverride_mode_idx" ON "BinderOverride"("mode");
