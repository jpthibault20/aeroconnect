-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "demoRefreshedAt" TIMESTAMPTZ(6),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Flag the existing demo club (no-op where it does not exist, e.g. in dev).
UPDATE "Club" SET "isDemo" = true WHERE "id" = 'LFdemo';
