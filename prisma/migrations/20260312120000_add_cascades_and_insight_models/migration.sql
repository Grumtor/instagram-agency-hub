-- Migration: add_cascades_and_insight_models
-- Adds RefreshToken, ConsumedOAuthState, AccountInsight, PostInsight tables.
-- Fixes FK cascade rules on Post and AuditLog.
-- Makes Post.createdById and AuditLog.userId nullable.
-- Changes Post.mediaUrls from TEXT to JSONB.

-- DropForeignKey (old constraints that will be recreated)
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_createdById_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

-- AlterTable Post: make createdById nullable, change mediaUrls to JSONB
ALTER TABLE "Post" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "mediaUrls" TYPE JSONB USING "mediaUrls"::jsonb;

-- AlterTable AuditLog: make userId nullable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsumedOAuthState
CREATE TABLE "ConsumedOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumedOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable AccountInsight
CREATE TABLE "AccountInsight" (
    "id" TEXT NOT NULL,
    "igAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "profileViews" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostInsight
CREATE TABLE "PostInsight" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex RefreshToken
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex ConsumedOAuthState
CREATE UNIQUE INDEX "ConsumedOAuthState_stateHash_key" ON "ConsumedOAuthState"("stateHash");
CREATE INDEX "ConsumedOAuthState_expiresAt_idx" ON "ConsumedOAuthState"("expiresAt");

-- CreateIndex AccountInsight
CREATE UNIQUE INDEX "AccountInsight_igAccountId_date_key" ON "AccountInsight"("igAccountId", "date");
CREATE INDEX "AccountInsight_igAccountId_idx" ON "AccountInsight"("igAccountId");

-- CreateIndex PostInsight
CREATE UNIQUE INDEX "PostInsight_postId_key" ON "PostInsight"("postId");

-- AddForeignKey RefreshToken -> User (CASCADE)
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ConsumedOAuthState (no FK, standalone table)

-- AddForeignKey AccountInsight -> InstagramAccount (CASCADE)
ALTER TABLE "AccountInsight" ADD CONSTRAINT "AccountInsight_igAccountId_fkey" FOREIGN KEY ("igAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey PostInsight -> Post (CASCADE)
ALTER TABLE "PostInsight" ADD CONSTRAINT "PostInsight_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Post.createdById -> User (SetNull, nullable)
ALTER TABLE "Post" ADD CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey AuditLog.userId -> User (SetNull, nullable)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
