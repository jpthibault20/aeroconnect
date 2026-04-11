import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ───

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function utcDate(year: number, month: number, day: number, hour: number, minute: number): Date {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
}

// ─── Données ───

const USERS = [
    // Instructeurs
    { firstName: "Marc", lastName: "Delacroix", email: "marc.delacroix@fictif.local", phone: "0601010101", role: "INSTRUCTOR" as const, classes: [3, 6] },
    { firstName: "Claire", lastName: "Beaumont", email: "claire.beaumont@fictif.local", phone: "0602020202", role: "INSTRUCTOR" as const, classes: [3, 6] },
    // Élèves
    { firstName: "Julien", lastName: "Morel", email: "julien.morel@fictif.local", phone: "0603030303", role: "STUDENT" as const, classes: [3] },
    { firstName: "Manon", lastName: "Dubois", email: "manon.dubois@fictif.local", phone: "0604040404", role: "STUDENT" as const, classes: [3] },
    { firstName: "Romain", lastName: "Leroy", email: "romain.leroy@fictif.local", phone: "0605050505", role: "STUDENT" as const, classes: [3] },
];

const PLANES_DATA = [
    { name: "Tecnam P2008", immatriculation: "F-JTEC", classes: 3, hobbsTotal: 920.4 },
    { name: "Savage Cruiser", immatriculation: "F-JSAV", classes: 3, hobbsTotal: 345.7 },
    { name: "Rotax 912 Ikarus", immatriculation: "F-JIKA", classes: 3, hobbsTotal: 1580.2 },
];

const NATURES: ("TRAINING" | "PRIVATE" | "SIGHTSEEING" | "DISCOVERY" | "EXAM")[] = [
    "TRAINING", "TRAINING", "TRAINING", "PRIVATE", "SIGHTSEEING", "DISCOVERY",
];

const COMMENTS_PILOTE = [
    "Bonne progression", "Travail sur les atterrissages", "Révision virages à grande inclinaison",
    "Navigation solo préparée", "Exercices de panne moteur", "Tour de piste x3",
    "Approche à corriger", null, null,
];

const COMMENTS_STUDENT = [
    "Météo un peu ventée", "Bonne séance", "J'ai du mal avec les atterrissages",
    "Super séance !", null, null, null,
];

async function main() {
    // Récupérer ton profil pour connaître le club
    const me = await prisma.user.findFirst({ where: { email: "tjeanpierre757@gmail.com" } });
    if (!me || !me.clubID) {
        console.log("❌ Profil ou club introuvable");
        return;
    }

    const clubID = me.clubID;

    // Récupérer le club pour l'airfield
    const club = await prisma.club.findUnique({ where: { id: clubID } });
    const airfield = club?.defaultAirfield ?? "LFXX";

    console.log(`🏢 Club: ${clubID} (${club?.Name})\n`);

    // ─── Utilisateurs ───
    console.log("👥 Création des utilisateurs...");
    const createdUsers: { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: string }[] = [];

    for (const u of USERS) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            console.log(`   ⏭️  ${u.firstName} ${u.lastName} existe déjà`);
            createdUsers.push(existing);
            continue;
        }

        const created = await prisma.user.create({
            data: {
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phone: u.phone,
                role: u.role,
                clubID,
                classes: u.classes,
            },
        });
        createdUsers.push(created);
        console.log(`   ✅ ${u.role.padEnd(10)} ${u.firstName} ${u.lastName}`);
    }

    const instructors = createdUsers.filter((u) => u.role === "INSTRUCTOR");
    const students = createdUsers.filter((u) => u.role === "STUDENT");

    // ─── Avions ───
    console.log("\n✈️  Création des avions...");
    const createdPlanes: { id: string; name: string; immatriculation: string; classes: number; hobbsTotal: number | null }[] = [];

    for (const pl of PLANES_DATA) {
        const existing = await prisma.planes.findFirst({
            where: { immatriculation: pl.immatriculation, clubID },
        });
        if (existing) {
            console.log(`   ⏭️  ${pl.name} (${pl.immatriculation}) existe déjà`);
            createdPlanes.push(existing);
            continue;
        }

        const created = await prisma.planes.create({
            data: { ...pl, clubID, operational: true },
        });
        createdPlanes.push(created);
        console.log(`   ✅ ${pl.name} (${pl.immatriculation}) — classe ${pl.classes}`);
    }

    // ─── Tâches de maintenance ───
    console.log("\n🔧 Création des tâches de maintenance...");
    for (const plane of createdPlanes) {
        const existingTask = await prisma.maintenanceTask.findFirst({
            where: { planeId: plane.id },
        });
        if (existingTask) {
            console.log(`   ⏭️  Maintenance ${plane.name} existe déjà`);
            continue;
        }

        await prisma.maintenanceTask.create({
            data: {
                id: `maint-${plane.id}-50h`,
                title: "Visite 50h",
                intervalHours: 50,
                lastPerformedDate: new Date("2025-12-15"),
                lastPerformedHobbs: (plane.hobbsTotal ?? 0) - 15,
                planeId: plane.id,
                updatedAt: new Date(),
            },
        });
        console.log(`   ✅ Maintenance ${plane.name}`);
    }

    // ─── Sessions de vol passées (janvier → mars 2026) ───
    console.log("\n📅 Création des séances (janvier - mars 2026)...");

    let sessionCount = 0;
    let reservedCount = 0;
    let freeCount = 0;

    // Du 5 janvier 2026 (lundi) au 31 mars 2026
    const startDate = new Date(2026, 0, 5); // 5 janvier 2026
    const endDate = new Date(2026, 2, 31);  // 31 mars 2026

    let currentWeekStart = new Date(startDate);

    while (currentWeekStart <= endDate) {
        // 3-5 jours de vol par semaine
        const flyingDays = [2, 3, 6]; // mardi, mercredi, samedi
        if (Math.random() > 0.4) flyingDays.push(4); // jeudi souvent
        if (Math.random() > 0.7) flyingDays.push(5); // vendredi parfois

        for (const dayOffset of flyingDays) {
            const sessionDate = addDays(currentWeekStart, dayOffset - 1);
            if (sessionDate > endDate) break;

            // 3-5 créneaux par jour
            const slotsCount = randomInt(3, 5);
            const startHour = randomInt(8, 10);

            for (let slot = 0; slot < slotsCount; slot++) {
                const hour = startHour + slot;
                if (hour > 18) break;

                const instructor = randomItem(instructors);
                const plane = randomItem(createdPlanes);
                const duration = randomItem([30, 45, 60, 60, 60, 90]);
                const nature = randomItem(NATURES);

                // ~65% des séances sont réservées (avec élève), ~35% restent libres
                const isReserved = Math.random() < 0.65;
                const student = isReserved ? randomItem(students) : null;

                const sessionStart = utcDate(
                    sessionDate.getFullYear(),
                    sessionDate.getMonth() + 1,
                    sessionDate.getDate(),
                    hour,
                    randomItem([0, 0, 0, 30])
                );

                await prisma.flight_sessions.create({
                    data: {
                        clubID,
                        sessionDateStart: sessionStart,
                        sessionDateDuration_min: duration,
                        pilotID: instructor.id,
                        pilotFirstName: instructor.firstName,
                        pilotLastName: instructor.lastName,
                        pilotComment: isReserved ? randomItem(COMMENTS_PILOTE) : null,
                        studentID: student?.id ?? null,
                        studentFirstName: student?.firstName ?? null,
                        studentLastName: student?.lastName ?? null,
                        studentEmail: student?.email ?? null,
                        studentPhone: student?.phone ?? null,
                        studentComment: isReserved ? randomItem(COMMENTS_STUDENT) : null,
                        studentPlaneID: isReserved ? plane.id : null,
                        planeID: [plane.id],
                        classes: [plane.classes],
                        flightType: nature,
                        natureOfTheft: [nature],
                        startLocation: airfield,
                        endLocation: airfield,
                        hobbsStart: isReserved ? (plane.hobbsTotal ?? 0) + sessionCount * 0.8 : null,
                        hobbsEnd: isReserved ? (plane.hobbsTotal ?? 0) + sessionCount * 0.8 + duration / 60 : null,
                        landings: 1,
                    },
                });

                sessionCount++;
                if (isReserved) reservedCount++;
                else freeCount++;
            }
        }

        currentWeekStart = addDays(currentWeekStart, 7);
    }

    console.log(`   ✅ ${sessionCount} séances créées (${reservedCount} réservées, ${freeCount} libres)`);

    // ─── Résumé ───
    console.log("\n🎉 Seed terminé !");
    console.log(`   Club: ${clubID}`);
    console.log(`   Utilisateurs: ${createdUsers.length} (${instructors.length} instructeurs, ${students.length} élèves)`);
    console.log(`   Avions: ${createdPlanes.length}`);
    console.log(`   Séances: ${sessionCount} (${reservedCount} réservées, ${freeCount} libres)`);
    console.log(`   Période: 5 janvier 2026 → 31 mars 2026`);
}

main()
    .catch((e) => {
        console.error("❌ Erreur:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
