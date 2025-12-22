-- AlterTable
ALTER TABLE "flight_sessions" ADD COLUMN     "natureOfTheft" "NatureOfTheft"[] DEFAULT ARRAY[]::"NatureOfTheft"[];
