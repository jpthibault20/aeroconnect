-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Address" TEXT NOT NULL,
    "City" TEXT NOT NULL,
    "Country" TEXT NOT NULL,
    "ZipCode" TEXT NOT NULL,
    "OwnerId" TEXT[],
    "DaysOn" TEXT[],
    "HoursOn" TEXT[],
    "SessionDurationMin" INTEGER NOT NULL,
    "AvailableMinutes" TEXT[],

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_id_key" ON "Club"("id");
