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

// ─── Configuration ───

const CLUB_ID = "LFXX-SEED";
const AIRFIELD = "LFXX";

const DAYS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DEFAULT_MINUTES = ["00", "15", "30", "45"];

// ─── Données réalistes ───

const INSTRUCTORS = [
    { firstName: "Jean", lastName: "Dupont", email: "jean.dupont@seed.local", phone: "0601020304" },
    { firstName: "Marie", lastName: "Laurent", email: "marie.laurent@seed.local", phone: "0605060708" },
    { firstName: "Pierre", lastName: "Martin", email: "pierre.martin@seed.local", phone: "0609101112" },
];

const STUDENTS = [
    { firstName: "Lucas", lastName: "Bernard", email: "lucas.bernard@seed.local", phone: "0611121314" },
    { firstName: "Emma", lastName: "Petit", email: "emma.petit@seed.local", phone: "0615161718" },
    { firstName: "Hugo", lastName: "Moreau", email: "hugo.moreau@seed.local", phone: "0619202122" },
    { firstName: "Lea", lastName: "Roux", email: "lea.roux@seed.local", phone: "0623242526" },
    { firstName: "Thomas", lastName: "Fournier", email: "thomas.fournier@seed.local", phone: "0627282930" },
    { firstName: "Camille", lastName: "Girard", email: "camille.girard@seed.local", phone: "0631323334" },
];

const PILOTS = [
    { firstName: "Antoine", lastName: "Lefevre", email: "antoine.lefevre@seed.local", phone: "0635363738" },
    { firstName: "Sophie", lastName: "Garcia", email: "sophie.garcia@seed.local", phone: "0639404142" },
];

const PLANES = [
    { name: "Robin DR400", immatriculation: "F-GSED", classes: 3, hobbsTotal: 1245.5 },
    { name: "Zenair CH701", immatriculation: "F-JULM", classes: 3, hobbsTotal: 832.3 },
    { name: "FK9 Mark IV", immatriculation: "F-JMKA", classes: 3, hobbsTotal: 567.8 },
    { name: "Guimbal G2", immatriculation: "F-HHEL", classes: 6, hobbsTotal: 410.2 },
];

const NATURES: ("TRAINING" | "PRIVATE" | "SIGHTSEEING" | "DISCOVERY" | "EXAM")[] = ["TRAINING", "TRAINING", "TRAINING", "PRIVATE", "SIGHTSEEING", "DISCOVERY"];
const COMMENTS_PILOTE = [
    "Bonne progression", "Travail sur les atterrissages", "Révision virages à grande inclinaison",
    "Navigation solo préparée", "Exercices de panne moteur", "Tour de piste x3",
    "Premier vol solo prévu prochaine séance", "Approche à corriger", null, null,
];
const COMMENTS_STUDENT = [
    "Météo un peu ventée", "Bonne séance", "J'ai du mal avec les atterrissages",
    "Super séance !", null, null, null,
];

async function main() {
    console.log("🌱 Début du seeding...\n");

    // ─── Nettoyage données seed précédentes ───
    console.log("🧹 Nettoyage des données seed existantes...");
    await prisma.flight_logs.deleteMany({ where: { clubID: CLUB_ID } });
    await prisma.flight_sessions.deleteMany({ where: { clubID: CLUB_ID } });
    await prisma.maintenanceTask.deleteMany({ where: { planes: { clubID: CLUB_ID } } });
    await prisma.planes.deleteMany({ where: { clubID: CLUB_ID } });
    await prisma.user.deleteMany({ where: { clubID: CLUB_ID } });
    await prisma.club.deleteMany({ where: { id: CLUB_ID } });

    // ─── Club ───
    console.log("🏢 Création du club...");
    await prisma.club.create({
        data: {
            id: CLUB_ID,
            Name: "Aéroclub du Soleil (Seed)",
            Address: "Route de l'aérodrome",
            City: "Montpellier",
            Country: "France",
            ZipCode: "34000",
            defaultAirfield: AIRFIELD,
            OwnerId: [],
            DaysOn: DAYS_FR,
            HoursOn: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            SessionDurationMin: 60,
            AvailableMinutes: DEFAULT_MINUTES,
            classes: [1, 2, 3, 4, 5, 6],
            userCanSubscribe: true,
            userCanUnsubscribe: true,
            preSubscribe: true,
            preUnsubscribe: true,
            timeDelaySubscribeminutes: 120,
            timeDelayUnsubscribeminutes: 120,
            firstNameContact: "Jean",
            lastNameContact: "Dupont",
            mailContact: "contact@aeroclub-seed.local",
            phoneContact: "0499000000",
        },
    });

    // ─── Users ───
    console.log("👥 Création des utilisateurs...");
    const createdInstructors = await Promise.all(
        INSTRUCTORS.map((u, i) =>
            prisma.user.create({
                data: {
                    ...u,
                    clubID: CLUB_ID,
                    role: i === 0 ? "OWNER" : "INSTRUCTOR",
                    classes: [3, 6],
                },
            })
        )
    );

    const createdStudents = await Promise.all(
        STUDENTS.map((u) =>
            prisma.user.create({
                data: {
                    ...u,
                    clubID: CLUB_ID,
                    role: "STUDENT",
                    classes: [3],
                },
            })
        )
    );

    const createdPilots = await Promise.all(
        PILOTS.map((u) =>
            prisma.user.create({
                data: {
                    ...u,
                    clubID: CLUB_ID,
                    role: "PILOT",
                    classes: [3, 6],
                },
            })
        )
    );

    // Mettre à jour OwnerId du club
    await prisma.club.update({
        where: { id: CLUB_ID },
        data: { OwnerId: [createdInstructors[0].id] },
    });

    // ─── Avions ───
    console.log("✈️  Création des avions...");
    const createdPlanes = await Promise.all(
        PLANES.map((p) =>
            prisma.planes.create({
                data: { ...p, clubID: CLUB_ID, operational: true },
            })
        )
    );

    // ─── Tâches de maintenance ───
    console.log("🔧 Création des tâches de maintenance...");
    for (const plane of createdPlanes) {
        await prisma.maintenanceTask.create({
            data: {
                id: `maint-${plane.id}-50h`,
                title: "Visite 50h",
                intervalHours: 50,
                lastPerformedDate: addDays(new Date(), -30),
                lastPerformedHobbs: (plane.hobbsTotal ?? 0) - 20,
                planeId: plane.id,
                updatedAt: new Date(),
            },
        });
    }

    // ─── Sessions de vol (janvier → aujourd'hui) ───
    console.log("📅 Création des sessions de vol...");

    const allUsers = [...createdInstructors, ...createdStudents, ...createdPilots];
    const class3Planes = createdPlanes.filter((p) => p.classes === 3);

    let sessionCount = 0;
    const startDate = new Date(2025, 0, 6); // 6 janvier 2025 (lundi)
    const today = new Date();

    // Générer des sessions semaine par semaine
    let currentWeekStart = new Date(startDate);

    while (currentWeekStart < today) {
        // 3-5 jours de vol par semaine (mardi, mercredi, samedi typiquement + aléatoire)
        const flyingDays = [2, 3, 6]; // mar, mer, sam
        if (Math.random() > 0.5) flyingDays.push(4); // jeudi parfois
        if (Math.random() > 0.7) flyingDays.push(5); // vendredi rarement

        for (const dayOffset of flyingDays) {
            const sessionDate = addDays(currentWeekStart, dayOffset - 1);
            if (sessionDate > today) break;

            // 3-6 créneaux par jour
            const slotsCount = randomInt(3, 6);
            const startHour = randomInt(8, 10);

            for (let slot = 0; slot < slotsCount; slot++) {
                const hour = startHour + slot;
                if (hour > 18) break;

                const instructor = randomItem(createdInstructors);
                const plane = randomItem(class3Planes);
                const duration = randomItem([30, 45, 60, 60, 60, 90]);
                const nature = randomItem(NATURES);
                const isPast = sessionDate < today;

                // ~80% des sessions passées ont un élève inscrit
                const hasStudent = isPast && Math.random() < 0.8;
                const student = hasStudent ? randomItem(createdStudents) : null;

                const sessionStart = utcDate(
                    sessionDate.getFullYear(),
                    sessionDate.getMonth() + 1,
                    sessionDate.getDate(),
                    hour,
                    randomItem([0, 0, 0, 30])
                );

                await prisma.flight_sessions.create({
                    data: {
                        clubID: CLUB_ID,
                        sessionDateStart: sessionStart,
                        sessionDateDuration_min: duration,
                        pilotID: instructor.id,
                        pilotFirstName: instructor.firstName,
                        pilotLastName: instructor.lastName,
                        pilotComment: hasStudent ? randomItem(COMMENTS_PILOTE) : null,
                        studentID: student?.id ?? null,
                        studentFirstName: student?.firstName ?? null,
                        studentLastName: student?.lastName ?? null,
                        studentEmail: student?.email ?? null,
                        studentPhone: student?.phone ?? null,
                        studentComment: hasStudent ? randomItem(COMMENTS_STUDENT) : null,
                        studentPlaneID: hasStudent ? plane.id : null,
                        planeID: [plane.id],
                        classes: [plane.classes],
                        flightType: nature,
                        natureOfTheft: [nature],
                        startLocation: AIRFIELD,
                        endLocation: AIRFIELD,
                        hobbsStart: hasStudent ? (plane.hobbsTotal ?? 0) + sessionCount * 0.8 : null,
                        hobbsEnd: hasStudent ? (plane.hobbsTotal ?? 0) + sessionCount * 0.8 + duration / 60 : null,
                        landings: 1,
                    },
                });
                sessionCount++;
            }
        }

        // Semaine suivante
        currentWeekStart = addDays(currentWeekStart, 7);
    }

    console.log(`   ✅ ${sessionCount} sessions créées`);

    // ─── Sessions futures (2 semaines) ───
    console.log("📅 Création des sessions futures...");
    let futureCount = 0;
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
        const futureDate = addDays(today, dayOffset);
        const dayOfWeek = futureDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 1) continue; // pas dim/lun

        const slotsCount = randomInt(3, 5);
        for (let slot = 0; slot < slotsCount; slot++) {
            const hour = 9 + slot;
            const instructor = randomItem(createdInstructors);
            const plane = randomItem(class3Planes);

            await prisma.flight_sessions.create({
                data: {
                    clubID: CLUB_ID,
                    sessionDateStart: utcDate(
                        futureDate.getFullYear(),
                        futureDate.getMonth() + 1,
                        futureDate.getDate(),
                        hour, 0
                    ),
                    sessionDateDuration_min: 60,
                    pilotID: instructor.id,
                    pilotFirstName: instructor.firstName,
                    pilotLastName: instructor.lastName,
                    planeID: [plane.id],
                    classes: [plane.classes],
                    flightType: "TRAINING",
                    natureOfTheft: ["TRAINING"],
                    startLocation: AIRFIELD,
                    endLocation: AIRFIELD,
                    landings: 1,
                },
            });
            futureCount++;
        }
    }
    console.log(`   ✅ ${futureCount} sessions futures créées`);

    // ─── Flight logs (auto-création simulée pour les sessions depuis juillet 2025) ───
    console.log("📖 Création des entrées de carnet de vol...");

    const pastSessionsWithStudent = await prisma.flight_sessions.findMany({
        where: {
            clubID: CLUB_ID,
            studentID: { not: null },
            sessionDateStart: {
                lt: today,
                gte: new Date("2025-07-01"),
            },
        },
    });

    let logCount = 0;
    for (const session of pastSessionsWithStudent) {
        const plane = createdPlanes.find((p) => p.id === session.studentPlaneID);

        // Entrée instructeur
        await prisma.flight_logs.create({
            data: {
                clubID: CLUB_ID,
                sessionID: session.id,
                date: session.sessionDateStart,
                planeID: session.studentPlaneID,
                planeRegistration: plane?.immatriculation ?? "N/A",
                planeName: plane?.name ?? "Inconnu",
                planeClass: plane?.classes ?? null,
                pilotID: session.pilotID,
                pilotFirstName: session.pilotFirstName,
                pilotLastName: session.pilotLastName,
                pilotFunction: "I",
                studentID: session.studentID,
                studentFirstName: session.studentFirstName,
                studentLastName: session.studentLastName,
                flightNature: "INSTRUCTION",
                durationMinutes: session.sessionDateDuration_min,
                takeoffs: 1,
                landings: 1,
                timeDC: 0,
                timePIC: 0,
                timeInstructor: session.sessionDateDuration_min,
                departureAirfield: AIRFIELD,
                arrivalAirfield: AIRFIELD,
                hobbsStart: session.hobbsStart,
                hobbsEnd: session.hobbsEnd,
                anomalies: Math.random() > 0.95 ? "Légère vibration moteur à signaler" : "RAS",
                pilotSigned: Math.random() > 0.15,
                pilotSignedAt: Math.random() > 0.15 ? session.sessionDateStart : null,
                remarks: randomItem(COMMENTS_PILOTE),
                isManualEntry: false,
            },
        });

        // Entrée élève
        await prisma.flight_logs.create({
            data: {
                clubID: CLUB_ID,
                sessionID: session.id,
                date: session.sessionDateStart,
                planeID: session.studentPlaneID,
                planeRegistration: plane?.immatriculation ?? "N/A",
                planeName: plane?.name ?? "Inconnu",
                planeClass: plane?.classes ?? null,
                pilotID: session.studentID!,
                pilotFirstName: session.studentFirstName ?? "",
                pilotLastName: session.studentLastName ?? "",
                pilotFunction: "EP",
                instructorID: session.pilotID,
                instructorFirstName: session.pilotFirstName,
                instructorLastName: session.pilotLastName,
                flightNature: "INSTRUCTION",
                durationMinutes: session.sessionDateDuration_min,
                takeoffs: 1,
                landings: 1,
                timeDC: session.sessionDateDuration_min,
                timePIC: 0,
                timeInstructor: 0,
                departureAirfield: AIRFIELD,
                arrivalAirfield: AIRFIELD,
                hobbsStart: session.hobbsStart,
                hobbsEnd: session.hobbsEnd,
                anomalies: "RAS",
                pilotSigned: Math.random() > 0.3,
                pilotSignedAt: Math.random() > 0.3 ? session.sessionDateStart : null,
                isManualEntry: false,
            },
        });

        logCount += 2;
    }
    console.log(`   ✅ ${logCount} entrées de carnet créées`);

    // ─── Résumé ───
    console.log("\n🎉 Seeding terminé !");
    console.log(`   Club: ${CLUB_ID}`);
    console.log(`   Utilisateurs: ${allUsers.length} (${createdInstructors.length} instructeurs, ${createdStudents.length} élèves, ${createdPilots.length} pilotes)`);
    console.log(`   Avions: ${createdPlanes.length}`);
    console.log(`   Sessions: ${sessionCount + futureCount} (${sessionCount} passées, ${futureCount} futures)`);
    console.log(`   Entrées carnet: ${logCount}`);
    console.log(`\n   Pour accéder: /calendar?clubID=${CLUB_ID}`);
}

main()
    .catch((e) => {
        console.error("❌ Erreur:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
