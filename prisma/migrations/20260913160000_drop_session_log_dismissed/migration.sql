-- La création automatique des entrées de carnet depuis le calendrier est
-- supprimée : le drapeau qui écartait une séance de cette synchro n'a plus
-- de raison d'être.

-- AlterTable
ALTER TABLE "flight_sessions" DROP COLUMN "logDismissed";
