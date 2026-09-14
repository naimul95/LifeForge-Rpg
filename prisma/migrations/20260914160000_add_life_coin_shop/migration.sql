CREATE TYPE "LifeCoinItemType" AS ENUM ('AVATAR', 'FRAME', 'EFFECT', 'BADGE');

CREATE TABLE "ShopItem" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "LifeCoinItemType" NOT NULL,
  "price" INTEGER NOT NULL,
  "previewUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserInventory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "equippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");
CREATE UNIQUE INDEX "UserInventory_userId_itemId_key" ON "UserInventory"("userId", "itemId");
CREATE INDEX "UserInventory_userId_equippedAt_idx" ON "UserInventory"("userId", "equippedAt");
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;