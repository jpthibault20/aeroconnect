import { userRole } from "@prisma/client";
import prisma from "@/api/prisma";
import {
    buildDemoDataset,
    DEMO_DEFAULT_INSTRUCTOR_RATE_CENTS,
    DEMO_DEFAULT_PLANE_RATE_CENTS,
    DEMO_PLANE_FIXTURES,
    demoTrainingPlanes,
    isDemoRefreshDue,
    missingDemoMembers,
} from "@/lib/demoClub";

/**
 * Demo club refresh: SERVER ONLY.
 *
 * Deliberately WITHOUT "use server" (like walletLedger.ts): it wipes a club's
 * activity and must never be callable from the browser. Its only caller is the
 * protected layout, with the signed-in user's own club.
 *
 * The append-only wallet ledger rule does not apply here: the demo club's
 * ledger is disposable and rebuilt from scratch with the rest of its activity.
 */

type DemoClubState = { id: string; isDemo: boolean; demoRefreshedAt: Date | null };

/**
 * Regenerates the demo club's sessions, logbook and wallets around today when
 * the last refresh is from an earlier club day. Returns true when THIS call
 * regenerated the data. Never throws: a failure must not prevent the prospect
 * from using the app.
 *
 * Call it before navigating to a page (login, club switch): Next renders the
 * layout and the page in parallel, so a page rendered alongside the refresh
 * reads the previous data.
 */
export async function refreshDemoClubIfDue(club: DemoClubState | null | undefined): Promise<boolean> {
    const now = new Date();
    if (!club || !isDemoRefreshDue(club, now)) return false;

    try {
        return await prisma.$transaction(async (tx) => {
            // Compare-and-set on the value read: when several prospects log in at
            // once, only the first one regenerates, the others see 0 rows here.
            const claimed = await tx.club.updateMany({
                where: { id: club.id, isDemo: true, demoRefreshedAt: club.demoRefreshedAt },
                data: { demoRefreshedAt: now },
            });
            if (claimed.count === 0) return false;

            const clubRow = await tx.club.findUniqueOrThrow({ where: { id: club.id } });
            // The wallet must be on (and priced) for the demo to show debits.
            await tx.club.update({
                where: { id: club.id },
                data: {
                    walletEnabled: true,
                    instructorHourlyRateCents: clubRow.instructorHourlyRateCents ?? DEMO_DEFAULT_INSTRUCTOR_RATE_CENTS,
                },
            });

            // ─── Create the members / aircraft the club lacks ───
            const members = await tx.user.findMany({ where: { clubID: club.id }, select: { role: true, email: true } });
            const toCreate = missingDemoMembers(members.map((m) => m.role), members.map((m) => m.email));
            if (toCreate.length > 0) {
                // skipDuplicates: an address already used in another club is left alone.
                await tx.user.createMany({ data: toCreate.map((m) => ({ ...m, clubID: club.id })), skipDuplicates: true });
            }

            let planes = await tx.planes.findMany({ where: { clubID: club.id } });
            if (demoTrainingPlanes(planes).length === 0) {
                await tx.planes.createMany({ data: DEMO_PLANE_FIXTURES.map((p) => ({ ...p, clubID: club.id, operational: true })) });
                planes = await tx.planes.findMany({ where: { clubID: club.id } });
            }
            const trainers = demoTrainingPlanes(planes);
            const unpriced = trainers.filter((p) => p.instructionHourlyRateCents == null).map((p) => p.id);
            if (unpriced.length > 0) {
                await tx.planes.updateMany({ where: { id: { in: unpriced } }, data: { instructionHourlyRateCents: DEMO_DEFAULT_PLANE_RATE_CENTS } });
                trainers.forEach((p) => { if (unpriced.includes(p.id)) p.instructionHourlyRateCents = DEMO_DEFAULT_PLANE_RATE_CENTS; });
            }

            const people = await tx.user.findMany({
                where: { clubID: club.id, role: { in: [userRole.INSTRUCTOR, userRole.STUDENT, userRole.PILOT, userRole.OWNER, userRole.MANAGER] } },
                select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true },
                orderBy: { email: "asc" },
            });
            const byRole = (role: userRole) => people.filter((p) => p.role === role);

            // ─── Wipe the previous activity, then rebuild it ───
            await tx.walletTransaction.deleteMany({ where: { clubID: club.id } });
            await tx.wallet.deleteMany({ where: { clubID: club.id } });
            await tx.baptemeRequest.deleteMany({ where: { clubID: club.id } });
            await tx.flight_logs.deleteMany({ where: { clubID: club.id } });
            await tx.flight_sessions.deleteMany({ where: { clubID: club.id } });

            const dataset = buildDemoDataset({
                clubID: club.id,
                airfield: clubRow.defaultAirfield ?? "LFXX",
                now,
                daysOn: clubRow.DaysOn,
                hoursOn: clubRow.HoursOn,
                instructorHourlyRateCents: clubRow.instructorHourlyRateCents ?? DEMO_DEFAULT_INSTRUCTOR_RATE_CENTS,
                instructors: byRole(userRole.INSTRUCTOR),
                students: byRole(userRole.STUDENT),
                pilots: byRole(userRole.PILOT),
                planes: trainers,
                managerID: (byRole(userRole.OWNER)[0] ?? byRole(userRole.MANAGER)[0])?.id ?? null,
            });

            await tx.flight_sessions.createMany({ data: dataset.sessions });
            await tx.flight_logs.createMany({ data: dataset.logs });
            await tx.walletTransaction.createMany({ data: dataset.transactions });
            await tx.wallet.createMany({ data: dataset.wallets.map((w) => ({ ...w, clubID: club.id })) });
            return true;
        }, { maxWait: 10_000, timeout: 30_000 });
    } catch (error) {
        console.error("[demoClub] refresh failed", error);
        return false;
    }
}

/** Same as refreshDemoClubIfDue, from a club ID (reads the demo flags). */
export async function refreshDemoClubByIDIfDue(clubID: string | null | undefined): Promise<boolean> {
    if (!clubID) return false;
    const club = await prisma.club.findUnique({ where: { id: clubID }, select: { id: true, isDemo: true, demoRefreshedAt: true } });
    return refreshDemoClubIfDue(club);
}
