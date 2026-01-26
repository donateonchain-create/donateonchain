-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'expired');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "totalHBAR" TEXT NOT NULL,
    "txHashes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "externalItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donorAddress" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "itemId" TEXT,
    "itemName" TEXT,
    "date" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignIndex" (
    "designId" TEXT NOT NULL,
    "metadataCid" TEXT NOT NULL,
    "previewCid" TEXT,
    "designCid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignIndex_pkey" PRIMARY KEY ("designId")
);

-- CreateTable
CREATE TABLE "KvDocument" (
    "id" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KvDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycVerification" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "KycVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT,
    "verificationId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirrorSyncCursor" (
    "id" TEXT NOT NULL,
    "contractIdOrAddress" TEXT NOT NULL,
    "nextTimestamp" TEXT NOT NULL,
    "nextIndex" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MirrorSyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirrorContractLog" (
    "id" TEXT NOT NULL,
    "contractIdOrAddress" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "transactionHash" TEXT,
    "transactionIndex" INTEGER,
    "blockHash" TEXT,
    "blockNumber" INTEGER,
    "rootContractId" TEXT,
    "address" TEXT,
    "bloom" TEXT,
    "data" TEXT,
    "topics" TEXT[],
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MirrorContractLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_buyer_idx" ON "Order"("buyer");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_externalItemId_idx" ON "OrderItem"("externalItemId");

-- CreateIndex
CREATE INDEX "Donation_donorAddress_idx" ON "Donation"("donorAddress");

-- CreateIndex
CREATE INDEX "Donation_campaignId_idx" ON "Donation"("campaignId");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

-- CreateIndex
CREATE INDEX "KvDocument_collection_idx" ON "KvDocument"("collection");

-- CreateIndex
CREATE UNIQUE INDEX "KvDocument_collection_key_key" ON "KvDocument"("collection", "key");

-- CreateIndex
CREATE INDEX "KycVerification_walletAddress_idx" ON "KycVerification"("walletAddress");

-- CreateIndex
CREATE INDEX "KycVerification_provider_idx" ON "KycVerification"("provider");

-- CreateIndex
CREATE INDEX "KycVerification_status_idx" ON "KycVerification"("status");

-- CreateIndex
CREATE INDEX "KycWebhookEvent_provider_idx" ON "KycWebhookEvent"("provider");

-- CreateIndex
CREATE INDEX "KycWebhookEvent_verificationId_idx" ON "KycWebhookEvent"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "KycWebhookEvent_provider_eventId_key" ON "KycWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorSyncCursor_contractIdOrAddress_key" ON "MirrorSyncCursor"("contractIdOrAddress");

-- CreateIndex
CREATE INDEX "MirrorContractLog_contractIdOrAddress_idx" ON "MirrorContractLog"("contractIdOrAddress");

-- CreateIndex
CREATE INDEX "MirrorContractLog_timestamp_idx" ON "MirrorContractLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorContractLog_contractIdOrAddress_timestamp_index_key" ON "MirrorContractLog"("contractIdOrAddress", "timestamp", "index");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
