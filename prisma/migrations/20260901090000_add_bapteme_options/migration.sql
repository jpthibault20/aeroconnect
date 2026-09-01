-- AlterTable
ALTER TABLE "BaptemeRequest" ADD COLUMN     "optionDurationMin" INTEGER,
ADD COLUMN     "optionPrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "BaptemeOption" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "planeId" TEXT NOT NULL,

    CONSTRAINT "BaptemeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaptemeOption_planeId_idx" ON "BaptemeOption"("planeId");

-- AddForeignKey
ALTER TABLE "BaptemeOption" ADD CONSTRAINT "BaptemeOption_planeId_fkey" FOREIGN KEY ("planeId") REFERENCES "planes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
