-- CreateEnum
CREATE TYPE "MachineUsage" AS ENUM ('INSTRUCTION', 'LOCATION', 'CLUB');

-- AlterTable
ALTER TABLE "planes" ADD COLUMN     "maintenanceHistory" JSONB,
ADD COLUMN     "ownerID" TEXT,
ADD COLUMN     "usageTypes" "MachineUsage"[] DEFAULT ARRAY[]::"MachineUsage"[];
