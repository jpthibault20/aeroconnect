-- CreateEnum
CREATE TYPE "userRole" AS ENUM ('USER', 'STUDENT', 'PILOT', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "flightType" AS ENUM ('FIRST_FLIGHT', 'INITATION', 'TRAINING');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "clubID" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "role" "userRole" NOT NULL DEFAULT 'USER',
    "country" TEXT,
    "zipCode" TEXT,
    "adress" TEXT,
    "city" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_sessions" (
    "id" SERIAL NOT NULL,
    "clubID" TEXT NOT NULL,
    "sessionDateStart" TIMESTAMPTZ(6) NOT NULL,
    "sessionDateDuration_min" INTEGER NOT NULL,
    "flightType" "flightType" NOT NULL,
    "pilotID" INTEGER NOT NULL,
    "pilotFirstName" TEXT NOT NULL,
    "pilotLastName" TEXT NOT NULL,
    "studentID" INTEGER,
    "studentFirstName" TEXT,
    "studentLastName" TEXT,
    "student_type" "flightType",
    "finalReccurence" TIMESTAMPTZ(6),
    "planeID" INTEGER[],

    CONSTRAINT "flight_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" SERIAL NOT NULL,
    "clubID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "operational" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "flight_sessions_id_key" ON "flight_sessions"("id");
