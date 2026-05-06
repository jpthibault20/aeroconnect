/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `flight_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `planes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `planes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "flight_sessions" DROP CONSTRAINT "flight_sessions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "flight_sessions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "flight_sessions_id_seq";

-- AlterTable
ALTER TABLE "planes" DROP CONSTRAINT "planes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "planes_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "planes_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "planes_id_key" ON "planes"("id");
