/*
  Warnings:

  - The `classes` column on the `planes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "planes" DROP COLUMN "classes",
ADD COLUMN     "classes" INTEGER NOT NULL DEFAULT 3;
