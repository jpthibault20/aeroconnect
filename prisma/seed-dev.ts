import { randomUUID } from "node:crypto";
import {
    flightNature,
    instructionSubType,
    MachineUsage,
    NatureOfTheft,
    PaymentMethod,
    pilotFunction,
    Prisma,
    PrismaClient,
    userRole,
    WalletRateSource,
    WalletTransactionType,
} from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Representative DEV dataset: one club, 10 members with every role, 5 aircraft
// (club + private), ~6 months of history (bookings, signed logbook, wallet
// ledger, maintenance) and the next 4 weeks of bookings.
//
// Scoped to CLUB_ID: rerunning it wipes and recreates ONLY this club's data, so
// it never touches other clubs. The developer account (OWNER_EMAIL) is attached
// to the club with its Supabase auth id so it can log in.
//
// Slots are stored as UTC wall-clock (see src/lib/clubTime.ts): a 14:00 slot is
// written T14:00:00Z.
//
// Run with:  npm run seed:dev
// ─────────────────────────────────────────────────────────────────────────────

const CLUB_ID = "LFXX";
const AIRFIELD = "LFXX";
const OWNER_EMAIL = "tjeanpierre757@gmail.com";
const HISTORY_DAYS = 180;
const FUTURE_DAYS = 28;
const CLUB_INSTRUCTOR_RATE_CENTS = 4_500;

// ─── Deterministic RNG (same dataset on every run for a given day) ───

let rngState = 20260402;
function rand(): number {
    rngState = (rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randomInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

const DAY_MS = 24 * 3600 * 1000;
// Same convention as toClubWallClock (src/lib/clubTime.ts): Paris clock time
// expressed as a UTC instant, comparable with slot starts.
function parisWallClock(instant: Date): Date {
    const text = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Paris", hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(instant);
    return new Date(`${text.replace(" ", "T")}Z`);
}
const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Fixtures ───

type Member = {
    key: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: userRole;
    classes: number[];
    city: string;
    zipCode: string;
    canSubscribeWithoutPlan?: boolean;
    restricted?: boolean;
    pendingRequest?: boolean; // USER who asked to join the club
};

const MEMBERS: Member[] = [
    { key: "owner", firstName: "Jean", lastName: "Dupont", email: "jean.dupont@seed.local", phone: "0601020304", role: "OWNER", classes: [2, 3, 4], city: "Montpellier", zipCode: "34000" },
    { key: "manager", firstName: "Sylvie", lastName: "Marchand", email: "sylvie.marchand@seed.local", phone: "0602030405", role: "MANAGER", classes: [], city: "Lattes", zipCode: "34970" },
    { key: "instrMarie", firstName: "Marie", lastName: "Laurent", email: "marie.laurent@seed.local", phone: "0605060708", role: "INSTRUCTOR", classes: [3, 4], city: "Pérols", zipCode: "34470" },
    { key: "instrPierre", firstName: "Pierre", lastName: "Martin", email: "pierre.martin@seed.local", phone: "0609101112", role: "INSTRUCTOR", classes: [2, 3], city: "Mauguio", zipCode: "34130" },
    { key: "stuLucas", firstName: "Lucas", lastName: "Bernard", email: "lucas.bernard@seed.local", phone: "0611121314", role: "STUDENT", classes: [], city: "Montpellier", zipCode: "34070" },
    { key: "stuEmma", firstName: "Emma", lastName: "Petit", email: "emma.petit@seed.local", phone: "0615161718", role: "STUDENT", classes: [], city: "Castelnau-le-Lez", zipCode: "34170" },
    { key: "stuHugo", firstName: "Hugo", lastName: "Moreau", email: "hugo.moreau@seed.local", phone: "0619202122", role: "STUDENT", classes: [], city: "Saint-Jean-de-Védas", zipCode: "34430", canSubscribeWithoutPlan: true },
    { key: "pilAntoine", firstName: "Antoine", lastName: "Lefèvre", email: "antoine.lefevre@seed.local", phone: "0635363738", role: "PILOT", classes: [3], city: "Lunel", zipCode: "34400" },
    { key: "pilSophie", firstName: "Sophie", lastName: "Garcia", email: "sophie.garcia@seed.local", phone: "0639404142", role: "PILOT", classes: [2, 3], city: "Sète", zipCode: "34200", restricted: true },
    { key: "visitor", firstName: "Nicolas", lastName: "Roux", email: "nicolas.roux@seed.local", phone: "0643444546", role: "USER", classes: [], city: "Nîmes", zipCode: "30000", pendingRequest: true },
];

type PlaneFixture = {
    key: string;
    name: string;
    immatriculation: string;
    classes: number;
    hobbsTotal: number;
    ownerKey: string | null;
    usageTypes: MachineUsage[];
    instructionHourlyRateCents: number | null;
    operational: boolean;
};

// Ownership mix: 3 club aircraft (one grounded for repair), 2 private ones
// (a pilot's and a student's, the latter trained on at the instructor rate).
const PLANES: PlaneFixture[] = [
    { key: "tecnam", name: "Tecnam P92 Echo", immatriculation: "F-JTEC", classes: 3, hobbsTotal: 1840.4, ownerKey: null, usageTypes: ["INSTRUCTION", "LOCATION"], instructionHourlyRateCents: 13_500, operational: true },
    { key: "ventum", name: "Ventum 912", immatriculation: "F-JVNT", classes: 3, hobbsTotal: 965.2, ownerKey: null, usageTypes: ["INSTRUCTION", "CLUB"], instructionHourlyRateCents: 12_000, operational: true },
    { key: "mtosport", name: "Autogire MTOsport", immatriculation: "F-JAUT", classes: 4, hobbsTotal: 512.7, ownerKey: null, usageTypes: ["INSTRUCTION"], instructionHourlyRateCents: 16_000, operational: false },
    { key: "skyranger", name: "Skyranger Nynja", immatriculation: "F-JSKY", classes: 3, hobbsTotal: 433.9, ownerKey: "pilAntoine", usageTypes: [], instructionHourlyRateCents: null, operational: true },
    { key: "pendulaire", name: "Pendulaire Air Création Tanarg", immatriculation: "F-JPEN", classes: 2, hobbsTotal: 288.1, ownerKey: "stuHugo", usageTypes: [], instructionHourlyRateCents: null, operational: true },
];

const PILOT_COMMENTS = [
    "Bonne progression", "Travail sur les atterrissages", "Virages à grande inclinaison",
    "Navigation préparée", "Exercices de panne moteur", "Tours de piste x4",
    "Approche à stabiliser", "Radio à travailler", null, null,
];
const STUDENT_COMMENTS = ["Météo un peu ventée", "Bonne séance", "Atterrissages encore durs", "Super séance !", null, null, null];
const OBSERVATIONS = ["Turbulences en finale", "Vent de travers 10 kt", "Très bonne visibilité", "Thermiques l'après-midi", null, null, null];
const ANOMALIES = ["Pression pneu avant faible", "Voyant alternateur intermittent", "Fixation capot à reprendre"];
const NAV_DESTINATIONS = ["LFMT", "LFNG", "LFTW", "LFMU", "LFNB"];
const PASSENGERS = [
    { firstName: "Claire", lastName: "Fabre", email: "claire.fabre@exemple.fr", phone: "0670010203" },
    { firstName: "Mathis", lastName: "Blanc", email: "mathis.blanc@exemple.fr", phone: "0671020304" },
    { firstName: "Inès", lastName: "Mercier", email: "ines.mercier@exemple.fr", phone: "0672030405" },
    { firstName: "Paul", lastName: "Chevalier", email: "paul.chevalier@exemple.fr", phone: "0673040506" },
];

// ─── Generated rows ───

type U = { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: userRole };
type P = PlaneFixture & { id: string; ownerID: string | null };

type Flight = {
    start: Date;
    durationMin: number; // booked slot
    flownMin: number; // Hobbs duration
    plane: P;
    kind: "INSTRUCTION" | "PILOT_DUAL" | "SOLO" | "BAPTEME";
    instructor: U | null;
    member: U | null; // student / pilot
    passenger: (typeof PASSENGERS)[number] | null;
    subType: instructionSubType | null;
    destination: string | null;
    withSession: boolean;
    logState: "signed" | "unsigned" | "none";
};

async function main() {
    const authUsers = await prisma.$queryRaw<{ id: string; email: string }[]>`select id::text, email from auth.users where email = ${OWNER_EMAIL}`;
    const meAuthID = authUsers[0]?.id;
    if (!meAuthID) {
        console.log(`❌ Aucun compte Supabase pour ${OWNER_EMAIL} : crée-le d'abord via /auth/register.`);
        return;
    }

    const now = new Date();
    const nowWall = parisWallClock(now);
    const today = new Date(Date.UTC(nowWall.getUTCFullYear(), nowWall.getUTCMonth(), nowWall.getUTCDate()));
    rngState = 20260402;

    console.log(`🌱 Seed dev du club ${CLUB_ID}…`);

    // ─── Wipe this club only ───
    const existingPlanes = await prisma.planes.findMany({ where: { clubID: CLUB_ID }, select: { id: true } });
    await prisma.$transaction([
        prisma.walletTransaction.deleteMany({ where: { clubID: CLUB_ID } }),
        prisma.wallet.deleteMany({ where: { clubID: CLUB_ID } }),
        prisma.baptemeRequest.deleteMany({ where: { clubID: CLUB_ID } }),
        prisma.flight_logs.deleteMany({ where: { clubID: CLUB_ID } }),
        prisma.flight_sessions.deleteMany({ where: { clubID: CLUB_ID } }),
        prisma.maintenanceTask.deleteMany({ where: { planeId: { in: existingPlanes.map((p) => p.id) } } }),
        prisma.baptemeOption.deleteMany({ where: { planeId: { in: existingPlanes.map((p) => p.id) } } }),
        prisma.planes.deleteMany({ where: { clubID: CLUB_ID } }),
        prisma.user.deleteMany({ where: { OR: [{ clubID: CLUB_ID }, { clubIDRequest: CLUB_ID }], NOT: { email: OWNER_EMAIL } } }),
        prisma.club.deleteMany({ where: { id: CLUB_ID } }),
    ]);

    // ─── Club ───
    await prisma.club.create({
        data: {
            id: CLUB_ID,
            Name: "Aéroclub ULM du Soleil",
            Address: "Route de l'aérodrome",
            City: "Montpellier",
            Country: "France",
            ZipCode: "34000",
            defaultAirfield: AIRFIELD,
            OwnerId: [],
            DaysOn: ["Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
            HoursOn: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
            SessionDurationMin: 60,
            AvailableMinutes: ["00", "30"],
            classes: [2, 3, 4],
            userCanSubscribe: true,
            userCanUnsubscribe: true,
            preSubscribe: true,
            preUnsubscribe: true,
            timeDelaySubscribeminutes: 120,
            timeDelayUnsubscribeminutes: 1440,
            firstNameContact: "Jean",
            lastNameContact: "Dupont",
            mailContact: "contact@aeroclub-soleil.local",
            phoneContact: "0467000000",
            walletEnabled: true,
            instructorHourlyRateCents: CLUB_INSTRUCTOR_RATE_CENTS,
            walletBookingMinCents: 0,
            walletLowBalanceEmail: false, // dev: never email fake members
        },
    });

    // ─── Members ───
    await prisma.user.upsert({
        where: { email: OWNER_EMAIL },
        create: { id: meAuthID, email: OWNER_EMAIL, firstName: "Thibault", lastName: "Jean-Pierre", role: "ADMIN", clubID: CLUB_ID, classes: [1, 2, 3, 4, 5, 6] },
        update: { clubID: CLUB_ID, role: "ADMIN" },
    });

    const users: Record<string, U> = {};
    for (const m of MEMBERS) {
        const created = await prisma.user.create({
            data: {
                email: m.email,
                firstName: m.firstName,
                lastName: m.lastName,
                phone: m.phone,
                role: m.role,
                classes: m.classes,
                city: m.city,
                zipCode: m.zipCode,
                country: "France",
                clubID: m.pendingRequest ? null : CLUB_ID,
                clubIDRequest: m.pendingRequest ? CLUB_ID : null,
                canSubscribeWithoutPlan: m.canSubscribeWithoutPlan ?? false,
                restricted: m.restricted ?? false,
            },
        });
        users[m.key] = created;
    }
    await prisma.club.update({ where: { id: CLUB_ID }, data: { OwnerId: [users.owner.id] } });

    const instructors = [users.instrMarie, users.instrPierre, users.owner];
    const students = [users.stuLucas, users.stuEmma, users.stuHugo];
    const pilots = [users.pilAntoine, users.pilSophie];

    // ─── Aircraft ───
    const planes: Record<string, P> = {};
    for (const pf of PLANES) {
        const ownerID = pf.ownerKey ? users[pf.ownerKey].id : null;
        const created = await prisma.planes.create({
            data: {
                clubID: CLUB_ID,
                name: pf.name,
                immatriculation: pf.immatriculation,
                classes: pf.classes,
                hobbsTotal: pf.hobbsTotal, // overwritten below once flights are laid out
                operational: pf.operational,
                ownerID,
                usageTypes: pf.usageTypes,
                instructionHourlyRateCents: pf.instructionHourlyRateCents,
            },
        });
        planes[pf.key] = { ...pf, id: created.id, ownerID };
    }
    const clubTrainers = [planes.tecnam, planes.ventum];
    const repairStart = new Date(today.getTime() - 9 * DAY_MS); // autogire grounded since

    // ─── Flights: history + upcoming ───
    const flights: Flight[] = [];
    const openDays = new Set([2, 3, 4, 5, 6, 0]);
    for (let offset = -HISTORY_DAYS; offset <= FUTURE_DAYS; offset++) {
        const day = new Date(today.getTime() + offset * DAY_MS);
        if (!openDays.has(day.getUTCDay())) continue;
        // Weekends are busier; winter quieter.
        const weekend = day.getUTCDay() === 6 || day.getUTCDay() === 0;
        const month = day.getUTCMonth();
        const seasonFactor = month >= 10 || month <= 1 ? 0.6 : 1;
        const count = Math.round((weekend ? randomInt(3, 5) : randomInt(1, 3)) * seasonFactor);

        const usedHours = new Set<number>();
        for (let i = 0; i < count; i++) {
            let hour = randomInt(8, 17);
            while (usedHours.has(hour)) hour = hour >= 17 ? 8 : hour + 1;
            usedHours.add(hour);
            const start = new Date(day.getTime() + hour * 3600 * 1000);
            const isPast = start.getTime() + 60 * 60 * 1000 < nowWall.getTime();

            const roll = rand();
            let flight: Flight;
            const autogireAvailable = start < repairStart;
            if (roll < 0.58) {
                // Instruction: student + instructor, club trainer or Hugo's own trike.
                const student = pick(students);
                const ownPlane = student.id === users.stuHugo.id && chance(0.6);
                const plane = ownPlane ? planes.pendulaire
                    : autogireAvailable && chance(0.15) ? planes.mtosport
                        : pick(clubTrainers);
                const instructor = plane.classes === 2 ? users.instrPierre : plane.classes === 4 ? users.instrMarie : pick(instructors);
                const subType = chance(0.7) ? "LOCAL" : chance(0.6) ? "NAVIGATION" : chance(0.7) ? "LACHE" : "EXAM";
                flight = {
                    start, durationMin: 60, flownMin: subType === "NAVIGATION" ? randomInt(70, 95) : randomInt(40, 65),
                    plane, kind: "INSTRUCTION", instructor, member: student, passenger: null, subType,
                    destination: subType === "NAVIGATION" ? pick(NAV_DESTINATIONS) : null, withSession: true, logState: "signed",
                };
            } else if (roll < 0.68) {
                // Pilot flying with an instructor (control flight): the pilot pays.
                const pilot = pick(pilots);
                flight = {
                    start, durationMin: 60, flownMin: randomInt(40, 60), plane: pick(clubTrainers), kind: "PILOT_DUAL",
                    instructor: pick(instructors), member: pilot, passenger: null, subType: "LOCAL",
                    destination: null, withSession: true, logState: "signed",
                };
            } else if (roll < 0.9) {
                // Solo flight (CDB): rental on a club plane or a private owner on their own.
                const pilot = pick(pilots);
                const own = pilot.id === users.pilAntoine.id && chance(0.6);
                flight = {
                    start, durationMin: 60, flownMin: randomInt(45, 90), plane: own ? planes.skyranger : pick(clubTrainers),
                    kind: "SOLO", instructor: null, member: pilot, passenger: null, subType: null,
                    destination: chance(0.4) ? pick(NAV_DESTINATIONS) : null, withSession: false, logState: "signed",
                };
            } else {
                // Discovery flight for an external passenger (never billed to the wallet).
                flight = {
                    start, durationMin: 60, flownMin: pick([15, 20, 30, 30, 45]), plane: pick(clubTrainers), kind: "BAPTEME",
                    instructor: pick(instructors), member: null, passenger: pick(PASSENGERS), subType: "BAPTEME",
                    destination: null, withSession: true, logState: "signed",
                };
            }

            if (!isPast) {
                flight.logState = "none";
                // A third of upcoming instruction slots are still open.
                if (flight.kind === "INSTRUCTION" && chance(0.35)) flight.member = null;
                if (flight.kind === "SOLO") continue; // solo flights are only logged after the fact
            } else if (offset >= -4) {
                // Recent flights: some still to log or to sign.
                flight.logState = chance(0.3) ? "none" : chance(0.5) ? "unsigned" : "signed";
                if (flight.kind === "SOLO" && flight.logState === "none") flight.logState = "unsigned";
            }
            flights.push(flight);
        }
    }

    // ─── Hobbs: replayed per aircraft so every counter ends on its fixture value ───
    const logged = flights.filter((f) => f.logState !== "none").sort((a, b) => a.start.getTime() - b.start.getTime());
    const hobbs = new Map<string, { start: number; end: number }>();
    for (const pf of Object.values(planes)) {
        const total = logged.filter((f) => f.plane.id === pf.id).reduce((s, f) => s + f.flownMin / 60, 0);
        let cursor = round2(pf.hobbsTotal - total);
        for (const f of logged.filter((x) => x.plane.id === pf.id)) {
            const end = round2(cursor + f.flownMin / 60);
            hobbs.set(`${f.start.toISOString()}|${pf.id}`, { start: cursor, end });
            cursor = end;
        }
        await prisma.planes.update({ where: { id: pf.id }, data: { hobbsTotal: round2(cursor) } });
        pf.hobbsTotal = round2(cursor);
    }

    // ─── Sessions + logs ───
    const sessions: Prisma.flight_sessionsCreateManyInput[] = [];
    const logs: Prisma.flight_logsCreateManyInput[] = [];
    type Charge = { at: Date; userID: string; log: Prisma.flight_logsCreateManyInput; plane: P; minutes: number };
    const charges: Charge[] = [];

    for (const f of flights) {
        const h = hobbs.get(`${f.start.toISOString()}|${f.plane.id}`);
        const sessionID = f.withSession ? randomUUID() : null;
        const nature: NatureOfTheft = f.kind === "BAPTEME" ? "DISCOVERY" : f.kind === "SOLO" ? "PRIVATE" : f.subType === "EXAM" ? "EXAM" : "TRAINING";
        const offered = f.member ? [f.plane.id] : clubTrainers.map((p) => p.id);

        if (sessionID && f.instructor) {
            sessions.push({
                id: sessionID,
                clubID: CLUB_ID,
                sessionDateStart: f.start,
                sessionDateDuration_min: f.durationMin,
                pilotID: f.instructor.id,
                pilotFirstName: f.instructor.firstName,
                pilotLastName: f.instructor.lastName,
                pilotComment: pick(PILOT_COMMENTS),
                studentID: f.member?.id ?? null,
                studentFirstName: f.member?.firstName ?? f.passenger?.firstName ?? null,
                studentLastName: f.member?.lastName ?? f.passenger?.lastName ?? null,
                studentEmail: f.member?.email ?? f.passenger?.email ?? null,
                studentPhone: f.member?.phone ?? f.passenger?.phone ?? null,
                studentComment: f.member ? pick(STUDENT_COMMENTS) : null,
                studentPlaneID: f.member || f.passenger ? f.plane.id : null,
                student_type: f.member ? "TRAINING" : f.passenger ? "FIRST_FLIGHT" : null,
                planeID: offered,
                classes: [...new Set(offered.map((id) => Object.values(planes).find((p) => p.id === id)!.classes))],
                flightType: nature,
                natureOfTheft: [nature],
                startLocation: AIRFIELD,
                endLocation: AIRFIELD,
                hobbsStart: f.logState !== "none" ? h?.start ?? null : null,
                hobbsEnd: f.logState !== "none" ? h?.end ?? null : null,
                landings: 1,
                flightComment: f.kind === "BAPTEME" ? `Baptême ${f.flownMin} min` : null,
            });
        }

        if (f.logState === "none" || !h) continue;
        const end = new Date(f.start.getTime() + f.flownMin * 60 * 1000);
        const signed = f.logState === "signed";
        const isInstruction = f.kind !== "SOLO";
        // Pilot of record: the instructor for student / discovery flights, the
        // member for dual control flights (EP) and solo flights (P).
        const pilot = f.kind === "PILOT_DUAL" || f.kind === "SOLO" ? f.member! : f.instructor!;
        const fn: pilotFunction = f.kind === "SOLO" ? "P" : f.kind === "PILOT_DUAL" ? "EP" : "I";
        const log: Prisma.flight_logsCreateManyInput = {
            id: randomUUID(),
            clubID: CLUB_ID,
            sessionID,
            date: new Date(Date.UTC(f.start.getUTCFullYear(), f.start.getUTCMonth(), f.start.getUTCDate())),
            planeID: f.plane.id,
            planeRegistration: f.plane.immatriculation,
            planeName: f.plane.name,
            planeClass: f.plane.classes,
            pilotID: pilot.id,
            pilotFirstName: pilot.firstName,
            pilotLastName: pilot.lastName,
            pilotFunction: fn,
            instructorID: f.kind === "PILOT_DUAL" ? f.instructor!.id : null,
            instructorFirstName: f.kind === "PILOT_DUAL" ? f.instructor!.firstName : null,
            instructorLastName: f.kind === "PILOT_DUAL" ? f.instructor!.lastName : null,
            studentID: f.kind === "INSTRUCTION" ? f.member!.id : null,
            studentFirstName: f.kind === "INSTRUCTION" ? f.member!.firstName : f.passenger?.firstName ?? null,
            studentLastName: f.kind === "INSTRUCTION" ? f.member!.lastName : f.passenger?.lastName ?? null,
            studentEmail: f.kind === "INSTRUCTION" ? f.member!.email : f.passenger?.email ?? null,
            studentPhone: f.kind === "INSTRUCTION" ? f.member!.phone : f.passenger?.phone ?? null,
            flightNature: isInstruction ? flightNature.INSTRUCTION : flightNature.CDB,
            instructionSubType: isInstruction ? f.subType : null,
            takeoffs: f.subType === "LOCAL" ? randomInt(1, 5) : 1,
            landings: 0, // set below (= takeoffs)
            departureAirfield: AIRFIELD,
            arrivalAirfield: AIRFIELD,
            hobbsStart: h.start,
            hobbsEnd: h.end,
            fuelAdded: chance(0.3) ? randomInt(15, 40) : null,
            machineAnomalies: chance(0.03) ? pick(ANOMALIES) : null,
            pilotSigned: signed,
            pilotSignedAt: signed ? new Date(Math.min(end.getTime() + 15 * 60 * 1000, now.getTime())) : null,
            personalObservation: pick(OBSERVATIONS),
            isManualEntry: !sessionID,
            createdAt: new Date(Math.min(end.getTime(), now.getTime())),
        };
        log.landings = log.takeoffs;
        logs.push(log);

        // Billable = signed instruction except discovery flights; payer = student,
        // or the pilot on a dual control flight (see src/lib/wallet.ts).
        if (signed && (f.kind === "INSTRUCTION" || f.kind === "PILOT_DUAL")) {
            charges.push({ at: log.pilotSignedAt as Date, userID: f.member!.id, log, plane: f.plane, minutes: Math.round((h.end - h.start) * 60) });
        }
    }

    await prisma.flight_sessions.createMany({ data: sessions });
    await prisma.flight_logs.createMany({ data: logs });

    // ─── Wallet ledger, replayed chronologically ───
    const payers = [...students, ...pilots];
    // Recharge habits: Lucas tops up generously, Emma lets it run low (ends
    // overdrawn), the others recharge whenever the balance gets low.
    const habits: Record<string, { first: number; topUp: number; threshold: number; stopsAfterDays?: number }> = {
        [users.stuLucas.id]: { first: 60_000, topUp: 50_000, threshold: 15_000 },
        [users.stuEmma.id]: { first: 30_000, topUp: 20_000, threshold: 5_000, stopsAfterDays: 12 },
        [users.stuHugo.id]: { first: 20_000, topUp: 15_000, threshold: 6_000 },
        [users.pilAntoine.id]: { first: 15_000, topUp: 10_000, threshold: 4_000 },
        [users.pilSophie.id]: { first: 10_000, topUp: 10_000, threshold: 3_000 },
    };
    const authors = [users.owner, users.manager];
    const methods: PaymentMethod[] = ["TRANSFER", "CHECK", "CARD", "CASH", "TRANSFER"];
    const historyStart = new Date(today.getTime() - (HISTORY_DAYS + 2) * DAY_MS + 10 * 3600 * 1000);
    const balances = new Map<string, number>();
    const txs: Prisma.WalletTransactionCreateManyInput[] = [];
    const move = (userID: string, at: Date, amountCents: number, type: WalletTransactionType, extra: Partial<Prisma.WalletTransactionCreateManyInput> = {}) => {
        const after = (balances.get(userID) ?? 0) + amountCents;
        balances.set(userID, after);
        txs.push({ clubID: CLUB_ID, userID, createdAt: at, type, amountCents, balanceAfterCents: after, ...extra });
    };

    for (const p of payers) {
        move(p.id, historyStart, habits[p.id].first, "CREDIT", { paymentMethod: "TRANSFER", authorID: users.owner.id, comment: "Provision de début de saison" });
    }
    for (const c of charges.sort((a, b) => a.at.getTime() - b.at.getTime())) {
        const habit = habits[c.userID];
        const isPrivate = c.plane.ownerID != null;
        const rateCents = isPrivate ? CLUB_INSTRUCTOR_RATE_CENTS : c.plane.instructionHourlyRateCents!;
        const amountCents = Math.round((rateCents * c.minutes) / 60);
        const daysAgo = (today.getTime() - c.at.getTime()) / DAY_MS;
        const keepsPaying = habit.stopsAfterDays == null || daysAgo > habit.stopsAfterDays;
        if ((balances.get(c.userID) ?? 0) - amountCents < habit.threshold && keepsPaying) {
            move(c.userID, new Date(c.at.getTime() - 2 * 3600 * 1000), habit.topUp, "CREDIT", {
                paymentMethod: pick(methods), authorID: pick(authors).id, comment: chance(0.3) ? "Rechargement" : null,
            });
        }
        move(c.userID, c.at, -amountCents, "DEBIT", {
            flightLogID: c.log.id as string,
            flightDate: c.log.date as Date,
            planeName: c.plane.name,
            planeRegistration: c.plane.immatriculation,
            durationMin: c.minutes,
            rateCents,
            rateSource: isPrivate ? WalletRateSource.INSTRUCTOR : WalletRateSource.PLANE,
        });
    }
    // A manual goodwill adjustment and a refund, as management would record them.
    move(users.stuLucas.id, new Date(today.getTime() - 40 * DAY_MS + 15 * 3600 * 1000), 2_500, "ADJUSTMENT", { authorID: users.owner.id, comment: "Geste commercial : vol écourté (météo)" });
    move(users.pilSophie.id, new Date(today.getTime() - 12 * DAY_MS + 11 * 3600 * 1000), -1_500, "ADJUSTMENT", { authorID: users.manager.id, comment: "Cotisation FFPLUM refacturée" });

    txs.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());
    // balanceAfterCents must follow the final chronological order per member.
    const running = new Map<string, number>();
    for (const t of txs) {
        const after = (running.get(t.userID) ?? 0) + t.amountCents;
        running.set(t.userID, after);
        t.balanceAfterCents = after;
    }
    await prisma.walletTransaction.createMany({ data: txs });
    await prisma.wallet.createMany({
        data: [...running.entries()].map(([userID, balanceCents]) => ({ clubID: CLUB_ID, userID, balanceCents })),
    });

    // ─── Maintenance: interval tasks + intervention history ───
    const iso = (daysAgo: number) => new Date(today.getTime() - daysAgo * DAY_MS + 9 * 3600 * 1000).toISOString();
    const intervention = (daysAgo: number, type: string, description: string, plane: P, hoursBack: number, author: U, comment?: string) => ({
        id: randomUUID(),
        date: iso(daysAgo),
        type,
        description,
        ...(comment ? { comment } : {}),
        engineHours: round2(plane.hobbsTotal - hoursBack),
        createdById: author.id,
        createdByName: `${author.firstName} ${author.lastName}`,
        createdAt: iso(daysAgo),
    });
    const histories: Record<string, object[]> = {
        tecnam: [
            intervention(170, "VISITE_ANNUELLE", "Visite annuelle complète, renouvellement CEN", planes.tecnam, 95, users.owner),
            intervention(120, "VIDANGE", "Vidange huile + filtre (Rotax 912)", planes.tecnam, 62, users.instrMarie),
            intervention(55, "VIDANGE", "Vidange huile + filtre", planes.tecnam, 21, users.instrMarie),
            intervention(30, "REPARATION", "Remplacement pneu avant", planes.tecnam, 9, users.owner, "Usure constatée lors de la prévol"),
        ],
        ventum: [
            intervention(150, "REVISION", "Révision 100 h moteur", planes.ventum, 70, users.owner),
            intervention(60, "VIDANGE", "Vidange huile + filtre", planes.ventum, 25, users.instrPierre),
            intervention(14, "PESEE", "Pesée et mise à jour du centrage", planes.ventum, 4, users.owner),
        ],
        mtosport: [
            intervention(140, "VISITE_ANNUELLE", "Visite annuelle", planes.mtosport, 30, users.owner),
            intervention(9, "REPARATION", "Rotor : roulement de moyeu à remplacer, appareil immobilisé", planes.mtosport, 0, users.instrMarie, "Pièce commandée, retour prévu sous 3 semaines"),
        ],
        skyranger: [intervention(100, "VIDANGE", "Vidange par le propriétaire", planes.skyranger, 35, users.pilAntoine)],
        pendulaire: [intervention(80, "REVISION", "Contrôle voilure et haubans", planes.pendulaire, 20, users.instrPierre)],
    };
    for (const [key, history] of Object.entries(histories)) {
        await prisma.planes.update({ where: { id: planes[key].id }, data: { maintenanceHistory: history as Prisma.InputJsonValue } });
    }

    const task = (plane: P, title: string, intervalHours: number | null, intervalMonths: number | null, daysAgo: number, hoursBack: number) => ({
        id: randomUUID(),
        updatedAt: now,
        title,
        intervalHours,
        intervalMonths,
        lastPerformedDate: new Date(today.getTime() - daysAgo * DAY_MS),
        lastPerformedHobbs: round2(plane.hobbsTotal - hoursBack),
        planeId: plane.id,
    });
    await prisma.maintenanceTask.createMany({
        data: [
            task(planes.tecnam, "Vidange moteur", 50, 12, 55, 21), // fine
            task(planes.tecnam, "Visite annuelle", null, 12, 170, 95), // fine
            task(planes.tecnam, "Révision 100 h", 100, null, 200, 96), // due very soon
            task(planes.ventum, "Vidange moteur", 50, 12, 60, 52), // overdue (hours)
            task(planes.ventum, "Révision 100 h", 100, 24, 150, 70),
            task(planes.mtosport, "Visite annuelle", null, 12, 140, 30),
            task(planes.mtosport, "Contrôle rotor", 25, 6, 190, 18), // overdue (months)
            task(planes.skyranger, "Vidange moteur", 50, 12, 100, 35),
            task(planes.pendulaire, "Contrôle voilure", null, 6, 80, 20),
        ],
    });

    // ─── Discovery-flight packages on club planes ───
    await prisma.baptemeOption.createMany({
        data: [
            { planeId: planes.tecnam.id, durationMin: 15, price: 60 },
            { planeId: planes.tecnam.id, durationMin: 30, price: 110 },
            { planeId: planes.ventum.id, durationMin: 20, price: 75 },
            { planeId: planes.ventum.id, durationMin: 45, price: 150 },
        ],
    });

    // ─── Summary ───
    const fmt = (c: number) => `${(c / 100).toFixed(2)} €`;
    console.log(`   👥 ${MEMBERS.length} membres + ${OWNER_EMAIL} (ADMIN)`);
    console.log(`   ✈️  ${PLANES.length} aéronefs`);
    console.log(`   📅 ${sessions.length} séances (${sessions.filter((s) => s.sessionDateStart > nowWall).length} à venir)`);
    console.log(`   📒 ${logs.length} entrées de carnet (${logs.filter((l) => !l.pilotSigned).length} non signées)`);
    console.log(`   💶 ${txs.length} transactions — soldes : ${payers.map((p) => `${p.firstName} ${fmt(running.get(p.id) ?? 0)}`).join(", ")}`);
    console.log(`\n🎉 Terminé ! Accès : /calendar?clubID=${CLUB_ID}`);
}

main()
    .catch((e) => {
        console.error("❌ Erreur:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
