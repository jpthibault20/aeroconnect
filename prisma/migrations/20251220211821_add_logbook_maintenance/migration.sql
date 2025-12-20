/*
  Warnings:

  - The `flightType` column on the `flight_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "NatureOfTheft" AS ENUM ('TRAINING', 'PRIVATE', 'SIGHTSEEING', 'DISCOVERY', 'EXAM');

-- AlterTable
ALTER TABLE "flight_sessions" ADD COLUMN     "endLocation" TEXT,
ADD COLUMN     "hobbsEnd" DOUBLE PRECISION,
ADD COLUMN     "hobbsStart" DOUBLE PRECISION,
ADD COLUMN     "landings" INTEGER DEFAULT 1,
ADD COLUMN     "startLocation" TEXT,
DROP COLUMN "flightType",
ADD COLUMN     "flightType" "NatureOfTheft";

-- AlterTable
ALTER TABLE "planes" ADD COLUMN     "hobbsTotal" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "intervalHours" DOUBLE PRECISION,
    "intervalMonths" INTEGER,
    "lastPerformedDate" TIMESTAMP(3) NOT NULL,
    "lastPerformedHobbs" DOUBLE PRECISION NOT NULL,
    "planeId" TEXT NOT NULL,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_planeId_fkey" FOREIGN KEY ("planeId") REFERENCES "planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
