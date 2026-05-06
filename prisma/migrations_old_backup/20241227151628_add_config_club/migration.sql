-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "classes" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
ADD COLUMN     "preSubscribe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preUnsubscribe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeDelaySubscribeminutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeDelayUnsubscribeminutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userCanSubscribe" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "userCanUnsubscribe" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "SessionDurationMin" SET DEFAULT 60,
ALTER COLUMN "AvailableMinutes" SET DEFAULT ARRAY[]::TEXT[];
