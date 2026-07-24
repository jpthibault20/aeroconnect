-- CreateEnum
CREATE TYPE "BaptemeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "publicBookingToken" TEXT;

-- CreateTable
CREATE TABLE "BaptemeRequest" (
    "id" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "sessionID" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "comment" TEXT,
    "planeID" TEXT NOT NULL,
    "status" "BaptemeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "BaptemeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaptemeRequest_clubID_status_idx" ON "BaptemeRequest"("clubID", "status");

-- CreateIndex
CREATE INDEX "BaptemeRequest_sessionID_status_idx" ON "BaptemeRequest"("sessionID", "status");
