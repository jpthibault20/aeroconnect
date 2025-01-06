-- AlterTable
ALTER TABLE "User" ADD COLUMN     "classes" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[];

-- AlterTable
ALTER TABLE "flight_sessions" ADD COLUMN     "classes" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[];

-- AlterTable
ALTER TABLE "planes" ADD COLUMN     "classes" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[];
