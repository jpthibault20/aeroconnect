import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Seed « mois en cours » — séances d'INSTRUCTION passées + à venir.
//
// Objectif : peupler le calendrier du mois courant avec des séances
// d'instruction (instructeur + élève + avion), ~10 par semaine max, réparties
// entre le passé et le futur du mois.
//
// Pré-requis : les utilisateurs (instructeurs / élèves) et les avions existent
// déjà. Le script ne crée QUE des flight_sessions et les réutilise.
//
// Idempotent : chaque séance créée est marquée via `flightComment` = SEED_TAG.
// Au lancement, toutes les séances portant ce tag pour le mois courant sont
// supprimées avant d'être recréées → relançable à la demande sans doublon.
//
// Lancement :  npx tsx prisma/seed-current-month.ts
//         ou :  npm run seed:month
// ─────────────────────────────────────────────────────────────────────────────

const OWNER_EMAIL = "tjeanpierre757@gmail.com";
const SEED_TAG = "[SEED-CURRENT-MONTH]";
const MAX_SESSIONS_PER_WEEK = 10;

// ─── Helpers ───

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function utcDate(year: number, month: number, day: number, hour: number, minute: number): Date {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
}

const COMMENTS_PILOTE = [
    "Bonne progression", "Travail sur les atterrissages", "Révision virages à grande inclinaison",
    "Navigation préparée", "Exercices de panne moteur", "Tour de piste x3",
    "Approche à corriger", null, null,
];

const COMMENTS_STUDENT = [
    "Météo un peu ventée", "Bonne séance", "J'ai du mal avec les atterrissages",
    "Super séance !", null, null, null,
];

async function main() {
    // ─── Club de l'utilisateur ───
    const me = await prisma.user.findFirst({ where: { email: OWNER_EMAIL } });
    if (!me || !me.clubID) {
        console.log("❌ Profil ou club introuvable pour", OWNER_EMAIL);
        return;
    }
    const clubID = me.clubID;

    const club = await prisma.club.findUnique({ where: { id: clubID } });
    const airfield = club?.defaultAirfield ?? "LFXX";
    console.log(`🏢 Club : ${clubID} (${club?.Name ?? "?"})`);

    // ─── Réutilisation des données existantes ───
    const instructors = await prisma.user.findMany({
        where: { clubID, role: "INSTRUCTOR" },
    });
    const students = await prisma.user.findMany({
        where: { clubID, role: "STUDENT" },
    });
    // Avions du club (machines club = ownerID null) et opérationnels
    const planes = await prisma.planes.findMany({
        where: { clubID, operational: true, ownerID: null },
    });

    if (instructors.length === 0) {
        console.log("❌ Aucun instructeur (role=INSTRUCTOR) dans le club. Crée-les d'abord.");
        return;
    }
    if (students.length === 0) {
        console.log("❌ Aucun élève (role=STUDENT) dans le club. Crée-les d'abord.");
        return;
    }
    if (planes.length === 0) {
        console.log("❌ Aucun avion opérationnel dans le club. Crée-les d'abord.");
        return;
    }

    console.log(`   👨‍🏫 ${instructors.length} instructeur(s), 🎓 ${students.length} élève(s), ✈️  ${planes.length} avion(s)`);

    // ─── Bornes du mois en cours ───
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0); // dernier jour du mois
    const daysInMonth = lastOfMonth.getDate();
    const monthLabel = firstOfMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    // ─── Purge des séances précédemment générées ce mois (idempotence) ───
    const purged = await prisma.flight_sessions.deleteMany({
        where: {
            clubID,
            flightComment: SEED_TAG,
            sessionDateStart: {
                gte: utcDate(year, month + 1, 1, 0, 0),
                lte: utcDate(year, month + 1, daysInMonth, 23, 59),
            },
        },
    });
    if (purged.count > 0) {
        console.log(`🧹 ${purged.count} séance(s) seed du mois purgée(s) avant régénération`);
    }

    console.log(`\n📅 Génération des séances d'instruction — ${monthLabel}`);

    // ─── Génération semaine par semaine ───
    let created = 0;
    let past = 0;
    let upcoming = 0;

    // Regrouper les jours du mois par numéro de semaine (semaine ISO : lundi)
    // On parcourt jour par jour, en tenant un compteur par semaine.
    let weekSessions = 0;
    let currentWeekKey = -1;

    // Jours de vol privilégiés (0=dim … 6=sam) : mar, mer, jeu, sam
    const FLYING_WEEKDAYS = new Set([2, 3, 4, 6]);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const weekday = date.getDay();

        // Clé de semaine : lundi de la semaine (pour réinitialiser le quota)
        const monday = new Date(date);
        const diffToMonday = (weekday + 6) % 7;
        monday.setDate(date.getDate() - diffToMonday);
        const weekKey = Math.floor(monday.getTime() / (7 * 24 * 3600 * 1000));
        if (weekKey !== currentWeekKey) {
            currentWeekKey = weekKey;
            weekSessions = 0;
        }

        // On ne vole pas tous les jours
        if (!FLYING_WEEKDAYS.has(weekday)) continue;
        if (weekSessions >= MAX_SESSIONS_PER_WEEK) continue;

        // 2 à 4 créneaux ce jour-là, sans dépasser le quota hebdo
        const remainingThisWeek = MAX_SESSIONS_PER_WEEK - weekSessions;
        const slots = Math.min(randomInt(2, 4), remainingThisWeek);
        const startHour = randomInt(8, 10);

        for (let slot = 0; slot < slots; slot++) {
            const hour = startHour + slot * 2;
            if (hour > 18) break;

            const instructor = randomItem(instructors);
            const student = randomItem(students);
            const plane = randomItem(planes);
            const duration = randomItem([45, 60, 60, 60, 90]);
            const minute = randomItem([0, 0, 0, 30]);

            const sessionStart = utcDate(year, month + 1, day, hour, minute);
            const isPast = sessionStart < now;

            await prisma.flight_sessions.create({
                data: {
                    clubID,
                    sessionDateStart: sessionStart,
                    sessionDateDuration_min: duration,
                    pilotID: instructor.id,
                    pilotFirstName: instructor.firstName,
                    pilotLastName: instructor.lastName,
                    // Séance d'instruction → élève inscrit
                    studentID: student.id,
                    studentFirstName: student.firstName,
                    studentLastName: student.lastName,
                    studentEmail: student.email,
                    studentPhone: student.phone,
                    student_type: "TRAINING",
                    studentPlaneID: plane.id,
                    pilotComment: randomItem(COMMENTS_PILOTE),
                    studentComment: randomItem(COMMENTS_STUDENT),
                    planeID: [plane.id],
                    classes: [plane.classes],
                    flightType: "TRAINING",
                    natureOfTheft: ["TRAINING"],
                    startLocation: airfield,
                    endLocation: airfield,
                    // hobbs renseignés uniquement pour les séances passées (vol effectué)
                    hobbsStart: isPast ? (plane.hobbsTotal ?? 0) + created * 0.8 : null,
                    hobbsEnd: isPast ? (plane.hobbsTotal ?? 0) + created * 0.8 + duration / 60 : null,
                    landings: 1,
                    // Tag d'idempotence
                    flightComment: SEED_TAG,
                },
            });

            created++;
            weekSessions++;
            if (isPast) past++;
            else upcoming++;

            if (weekSessions >= MAX_SESSIONS_PER_WEEK) break;
        }
    }

    console.log(`   ✅ ${created} séance(s) créée(s) — ${past} passée(s), ${upcoming} à venir`);
    console.log(`\n🎉 Terminé ! Accès : /calendar?clubID=${clubID}`);
}

main()
    .catch((e) => {
        console.error("❌ Erreur:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
