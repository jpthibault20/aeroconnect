-- Vider flight_logs avant de reshape l'enum flightNature et les colonnes
-- (CDB remplace les anciennes valeurs LOCAL/NAVIGATION/VLO/VLD/EXAM/FIRST_FLIGHT/BAPTEME/OTHER)
TRUNCATE TABLE "flight_logs";

-- CreateEnum
CREATE TYPE "instructionSubType" AS ENUM ('LOCAL', 'NAVIGATION', 'LACHE', 'BAPTEME', 'EXAM');

-- AlterEnum
BEGIN;
CREATE TYPE "flightNature_new" AS ENUM ('CDB', 'INSTRUCTION');
ALTER TABLE "flight_logs" ALTER COLUMN "flightNature" TYPE "flightNature_new" USING ("flightNature"::text::"flightNature_new");
ALTER TYPE "flightNature" RENAME TO "flightNature_old";
ALTER TYPE "flightNature_new" RENAME TO "flightNature";
DROP TYPE "public"."flightNature_old";
COMMIT;

-- AlterTable
ALTER TABLE "flight_logs" DROP COLUMN "anomalies",
DROP COLUMN "durationMinutes",
DROP COLUMN "oilAdded",
DROP COLUMN "remarks",
DROP COLUMN "timeDC",
DROP COLUMN "timeInstructor",
DROP COLUMN "timePIC",
ADD COLUMN     "instructionSubType" "instructionSubType",
ADD COLUMN     "machineAnomalies" TEXT,
ADD COLUMN     "personalObservation" TEXT;
