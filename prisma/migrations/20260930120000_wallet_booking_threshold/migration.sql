-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "walletBookingMinCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walletLowBalanceEmail" BOOLEAN NOT NULL DEFAULT true;
