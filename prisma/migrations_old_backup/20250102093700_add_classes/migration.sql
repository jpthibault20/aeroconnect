-- AlterTable
ALTER TABLE "User" ALTER COLUMN "classes" SET DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "flight_sessions" ALTER COLUMN "classes" SET DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "planes" ALTER COLUMN "classes" SET DEFAULT ARRAY[]::INTEGER[];
