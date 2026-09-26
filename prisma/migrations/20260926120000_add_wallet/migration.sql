-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "WalletRateSource" AS ENUM ('PLANE', 'INSTRUCTOR');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "instructorHourlyRateCents" INTEGER,
ADD COLUMN     "walletEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "planes" ADD COLUMN     "instructionHourlyRateCents" INTEGER;

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "WalletTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod",
    "comment" TEXT,
    "authorID" TEXT,
    "flightLogID" TEXT,
    "flightDate" DATE,
    "planeName" TEXT,
    "planeRegistration" TEXT,
    "durationMin" INTEGER,
    "rateCents" INTEGER,
    "rateSource" "WalletRateSource",

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_clubID_userID_key" ON "Wallet"("clubID", "userID");

-- CreateIndex
CREATE INDEX "WalletTransaction_clubID_userID_createdAt_idx" ON "WalletTransaction"("clubID", "userID", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_flightLogID_idx" ON "WalletTransaction"("flightLogID");
