-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "userRole" AS ENUM ('USER', 'STUDENT', 'PILOT', 'OWNER', 'ADMIN', 'INSTRUCTOR', 'MANAGER');

-- CreateEnum
CREATE TYPE "flightType" AS ENUM ('FIRST_FLIGHT', 'INITATION', 'TRAINING');

-- CreateEnum
CREATE TYPE "NatureOfTheft" AS ENUM ('TRAINING', 'PRIVATE', 'SIGHTSEEING', 'DISCOVERY', 'EXAM');

-- CreateEnum
CREATE TYPE "pilotFunction" AS ENUM ('EP', 'P', 'I');

-- CreateEnum
CREATE TYPE "flightNature" AS ENUM ('INSTRUCTION', 'LOCAL', 'NAVIGATION', 'VLO', 'VLD', 'EXAM', 'FIRST_FLIGHT', 'BAPTEME', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clubID" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "role" "userRole" NOT NULL DEFAULT 'USER',
    "country" TEXT,
    "zipCode" TEXT,
    "adress" TEXT,
    "city" TEXT,
    "clubIDRequest" TEXT,
    "classes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "canSubscribeWithoutPlan" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_sessions" (
    "id" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "sessionDateStart" TIMESTAMPTZ(6) NOT NULL,
    "sessionDateDuration_min" INTEGER NOT NULL,
    "pilotID" TEXT NOT NULL,
    "pilotFirstName" TEXT NOT NULL,
    "pilotLastName" TEXT NOT NULL,
    "studentID" TEXT,
    "studentFirstName" TEXT,
    "studentLastName" TEXT,
    "student_type" "flightType",
    "finalReccurence" TIMESTAMPTZ(6),
    "planeID" TEXT[],
    "studentPlaneID" TEXT,
    "classes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "studentEmail" TEXT,
    "studentPhone" TEXT,
    "pilotComment" TEXT,
    "studentComment" TEXT,
    "endLocation" TEXT,
    "hobbsEnd" DOUBLE PRECISION,
    "hobbsStart" DOUBLE PRECISION,
    "landings" INTEGER DEFAULT 1,
    "startLocation" TEXT,
    "flightType" "NatureOfTheft",
    "flightComment" TEXT,

    CONSTRAINT "flight_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "operational" BOOLEAN NOT NULL DEFAULT true,
    "classes" INTEGER NOT NULL DEFAULT 3,
    "hobbsTotal" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Address" TEXT,
    "City" TEXT,
    "Country" TEXT,
    "ZipCode" TEXT,
    "defaultAirfield" TEXT,
    "OwnerId" TEXT[],
    "DaysOn" TEXT[],
    "SessionDurationMin" INTEGER NOT NULL DEFAULT 60,
    "AvailableMinutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "HoursOn" INTEGER[],
    "classes" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "preSubscribe" BOOLEAN NOT NULL DEFAULT false,
    "preUnsubscribe" BOOLEAN NOT NULL DEFAULT false,
    "timeDelaySubscribeminutes" INTEGER NOT NULL DEFAULT 0,
    "timeDelayUnsubscribeminutes" INTEGER NOT NULL DEFAULT 0,
    "userCanSubscribe" BOOLEAN NOT NULL DEFAULT true,
    "userCanUnsubscribe" BOOLEAN NOT NULL DEFAULT true,
    "firstNameContact" TEXT,
    "lastNameContact" TEXT,
    "mailContact" TEXT,
    "phoneContact" TEXT,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "flight_logs" (
    "id" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "sessionID" TEXT,
    "date" DATE NOT NULL,
    "planeID" TEXT,
    "planeRegistration" TEXT NOT NULL,
    "planeName" TEXT NOT NULL,
    "planeClass" INTEGER,
    "pilotID" TEXT NOT NULL,
    "pilotFirstName" TEXT NOT NULL,
    "pilotLastName" TEXT NOT NULL,
    "pilotFunction" "pilotFunction" NOT NULL,
    "instructorID" TEXT,
    "instructorFirstName" TEXT,
    "instructorLastName" TEXT,
    "studentID" TEXT,
    "studentFirstName" TEXT,
    "studentLastName" TEXT,
    "flightNature" "flightNature" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "takeoffs" INTEGER NOT NULL DEFAULT 1,
    "landings" INTEGER NOT NULL DEFAULT 1,
    "timeDC" INTEGER NOT NULL DEFAULT 0,
    "timePIC" INTEGER NOT NULL DEFAULT 0,
    "timeInstructor" INTEGER NOT NULL DEFAULT 0,
    "departureAirfield" TEXT,
    "arrivalAirfield" TEXT,
    "hobbsStart" DOUBLE PRECISION,
    "hobbsEnd" DOUBLE PRECISION,
    "fuelAdded" DOUBLE PRECISION,
    "oilAdded" DOUBLE PRECISION,
    "anomalies" TEXT,
    "pilotSigned" BOOLEAN NOT NULL DEFAULT false,
    "pilotSignedAt" TIMESTAMPTZ(6),
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "isManualEntry" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "flight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "flight_sessions_id_key" ON "flight_sessions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "planes_id_key" ON "planes"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Club_id_key" ON "Club"("id");

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_planeId_fkey" FOREIGN KEY ("planeId") REFERENCES "planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

