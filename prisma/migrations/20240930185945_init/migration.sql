/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clubID` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "userRole" AS ENUM ('USER', 'STUDENT', 'PILOT', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "flightType" AS ENUM ('FIRST_FLIGHT', 'INITATION', 'COURSE');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "adressID" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clubID" INTEGER NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "userRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "FLIGHT_SESSION" (
    "id" SERIAL NOT NULL,
    "clubID" INTEGER NOT NULL,
    "sessionDateStart" TIMESTAMP(3) NOT NULL,
    "sessionDateDuration_min" INTEGER NOT NULL,
    "finalReccurence" INTEGER NOT NULL,
    "flightType" "flightType" NOT NULL,
    "pilotID" INTEGER NOT NULL,
    "pilotFirstName" TEXT NOT NULL,
    "pilotLastName" TEXT NOT NULL,
    "studentID" INTEGER NOT NULL,
    "studentFirstName" TEXT NOT NULL,
    "studentLastName" TEXT NOT NULL,
    "student_type" "flightType" NOT NULL,

    CONSTRAINT "FLIGHT_SESSION_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FLIGHT_SESSION_id_key" ON "FLIGHT_SESSION"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
