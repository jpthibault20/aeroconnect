"use server";

import { randomUUID } from "crypto";
import { BaptemeRequest, NatureOfTheft, userRole } from "@prisma/client";
import prisma from "../prisma";
import { requireAuth } from "./users";
import { expireStaleHolds, RELEASE_SESSION_DATA } from "./baptemeHold";
import { appUrl } from "@/lib/appUrl";
import {
    BAPTEME_HOLD_STUDENT_ID,
    BAPTEME_MANAGEMENT_ROLES,
    buildBaptemeSessionComment,
    canValidateBapteme,
    computeHoldExpiry,
    filterBaptemePlanes,
    formatBaptemeOptionLabel,
    hasActiveHold,
    isBaptemeSlotAvailable,
    PUBLIC_BOOKING_HORIZON_DAYS,
    PUBLIC_LINK_MANAGE_ROLES,
} from "@/lib/bapteme";
import { baptemeRequestSchema } from "@/schemas/baptemeSchema";
import { toClubWallClock } from "@/lib/clubTime";
import { planeImagePublicUrl } from "@/lib/planeImage";
import { verifyCaptcha } from "@/lib/captcha";
import {
    sendBaptemeClientConfirmed,
    sendBaptemeClientReceived,
    sendBaptemeClientRejected,
    sendBaptemePilotNotification,
} from "@/lib/mail";



// ─── Internal helpers ───

// Validates the (clubID, token) pair against the club's current public token.
// Returns the club if the link is valid, null otherwise.
async function resolveClubByToken(clubID: string, token: string) {
    if (!clubID || !token) return null;
    const club = await prisma.club.findUnique({ where: { id: clubID } });
    if (!club || !club.publicBookingToken) return null;
    if (club.publicBookingToken !== token) return null;
    return club;
}

/**
 * DTO shared by both validation entry points (Club page and calendar popup): the
 * request enriched with its slot and plane, filtered to what `user` is allowed to
 * handle (assigned pilot or management).
 */
async function buildPendingBaptemeItems(
    requests: BaptemeRequest[],
    user: { id: string; role: userRole }
) {
    if (requests.length === 0) return [];

    const [sessions, planes] = await Promise.all([
        prisma.flight_sessions.findMany({
            where: { id: { in: requests.map((r) => r.sessionID) } },
            select: {
                id: true,
                pilotID: true,
                pilotFirstName: true,
                pilotLastName: true,
                sessionDateStart: true,
                sessionDateDuration_min: true,
            },
        }),
        prisma.planes.findMany({
            where: { id: { in: requests.map((r) => r.planeID) } },
            select: { id: true, name: true },
        }),
    ]);
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const planeName = new Map(planes.map((p) => [p.id, p.name]));

    return requests
        .map((r) => {
            const session = sessionById.get(r.sessionID);
            if (!session) return null;
            if (!canValidateBapteme(user, { pilotID: session.pilotID })) return null;
            const start = session.sessionDateStart;
            const end = new Date(start.getTime() + session.sessionDateDuration_min * 60 * 1000);
            return {
                id: r.id,
                sessionID: r.sessionID,
                planeID: r.planeID,
                firstName: r.firstName,
                lastName: r.lastName,
                email: r.email,
                phone: r.phone,
                comment: r.comment,
                optionLabel:
                    r.optionDurationMin != null && r.optionPrice != null
                        ? formatBaptemeOptionLabel({ durationMin: r.optionDurationMin, price: r.optionPrice })
                        : null,
                createdAt: r.createdAt,
                expiresAt: r.expiresAt,
                sessionDateStart: start,
                sessionDateEnd: end,
                pilotFirstName: session.pilotFirstName,
                pilotLastName: session.pilotLastName,
                planeName: planeName.get(r.planeID) ?? "Appareil",
            };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
}


// ─── Public actions (NO requireAuth) ───

/**
 * Discovery-flight slots offered to the public for a club through its link.
 * Only exposes non-sensitive data: slot id, date, duration and the list of
 * bookable CLUB planes (id + name). Never a private plane or a non-discovery slot.
 */
export const getPublicBaptemeSlots = async (clubID: string, token: string) => {
    const club = await resolveClubByToken(clubID, token);
    if (!club) return { error: "Lien invalide ou expiré." };

    const now = new Date();
    // Slots are stored as UTC wall-clock: comparing them to the real instant would
    // let through slots that ended less than 2 h ago in summer.
    const slotNow = toClubWallClock(now);

    // Nothing is offered past the horizon, so the payload stays bounded even for a
    // club that opens slots far in advance.
    const horizon = new Date(slotNow.getTime() + PUBLIC_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000);

    try {
        const [sessions, planes, holds, busySessions] = await Promise.all([
            prisma.flight_sessions.findMany({
                where: {
                    clubID,
                    studentID: null,
                    sessionDateStart: { gte: slotNow, lte: horizon },
                    natureOfTheft: { has: NatureOfTheft.DISCOVERY },
                },
                orderBy: { sessionDateStart: "asc" },
            }),
            prisma.planes.findMany({
                where: { clubID, ownerID: null, operational: true },
                select: {
                    id: true,
                    name: true,
                    ownerID: true,
                    operational: true,
                    classes: true,
                    imagePath: true,
                    BaptemeOption: {
                        select: { id: true, durationMin: true, price: true },
                        orderBy: { durationMin: "asc" },
                    },
                },
            }),
            prisma.baptemeRequest.findMany({
                where: { clubID, status: "PENDING" },
                select: { sessionID: true, status: true, expiresAt: true },
            }),
            // Planes already committed to an upcoming time, whatever the flight type:
            // a competing discovery flight as well as a member's booking.
            prisma.flight_sessions.findMany({
                where: {
                    clubID,
                    sessionDateStart: { gte: slotNow, lte: horizon },
                    studentPlaneID: { not: null },
                },
                select: { sessionDateStart: true, studentPlaneID: true },
            }),
        ]);

        const holdsBySession = new Map<string, { status: "PENDING"; expiresAt: Date }[]>();
        for (const h of holds) {
            const list = holdsBySession.get(h.sessionID) ?? [];
            list.push({ status: "PENDING", expiresAt: h.expiresAt });
            holdsBySession.set(h.sessionID, list);
        }

        // Keyed by start time: two simultaneous sessions cannot sell the same plane.
        const takenPlanesByStart = new Map<number, string[]>();
        for (const s of busySessions) {
            if (!s.studentPlaneID) continue;
            const key = s.sessionDateStart.getTime();
            const list = takenPlanesByStart.get(key) ?? [];
            list.push(s.studentPlaneID);
            takenPlanesByStart.set(key, list);
        }
        const takenAt = (start: Date) => takenPlanesByStart.get(start.getTime()) ?? [];

        // Name + photo of each plane: the customer picks the plane by seeing it, not
        // just from a model name. The URL is built here (the raw DB path means nothing
        // to the browser).
        const planeInfo = new Map(
            planes.map((p) => [
                p.id,
                {
                    name: p.name,
                    imageUrl: planeImagePublicUrl(p.imagePath),
                    baptemeOptions: p.BaptemeOption,
                },
            ])
        );

        const slots = sessions
            .filter((s) =>
                isBaptemeSlotAvailable(
                    {
                        studentID: s.studentID,
                        natureOfTheft: s.natureOfTheft,
                        sessionDateStart: s.sessionDateStart,
                        planeID: s.planeID,
                        classes: s.classes,
                    },
                    planes,
                    holdsBySession.get(s.id) ?? [],
                    now,
                    slotNow,
                    takenAt(s.sessionDateStart)
                )
            )
            .map((s) => ({
                sessionID: s.id,
                sessionDateStart: s.sessionDateStart,
                durationMin: s.sessionDateDuration_min,
                // Name of the pilot flying: the customer picks the slot knowingly. No contact
                // details are exposed here (public page); they come in the confirmation email
                // once the request is accepted.
                pilotFirstName: s.pilotFirstName,
                pilotLastName: s.pilotLastName,
                planes: filterBaptemePlanes(
                    planes,
                    { planeID: s.planeID, classes: s.classes },
                    takenAt(s.sessionDateStart)
                ).map(
                    (p) => ({
                        id: p.id,
                        name: planeInfo.get(p.id)?.name ?? "Appareil",
                        imageUrl: planeInfo.get(p.id)?.imageUrl ?? null,
                        baptemeOptions: planeInfo.get(p.id)?.baptemeOptions ?? [],
                    })
                ),
            }));

        // Club's public contact details, shown on the public page so visitors can reach
        // the club (address, phone, email, contact person).
        const clubContact = {
            firstNameContact: club.firstNameContact,
            lastNameContact: club.lastNameContact,
            mailContact: club.mailContact,
            phoneContact: club.phoneContact,
            Address: club.Address,
            City: club.City,
            ZipCode: club.ZipCode,
            Country: club.Country,
        };

        return { clubName: club.Name, clubContact, slots };
    } catch {
        return { error: "Erreur lors de la récupération des créneaux." };
    }
};

interface CreateBaptemeInput {
    clubID: string;
    token: string;
    sessionID: string;
    planeID: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    comment?: string;
    // Package (duration + price) chosen among those configured on the plane.
    // Absent if the plane has none.
    baptemeOptionID?: string;
    captchaToken?: string;
}

/**
 * Creates a PENDING discovery-flight request (places a hold on the slot).
 * Unauthenticated: clubID / token / slot / plane + captcha are fully revalidated,
 * and the anti-double-hold rule applies (one active PENDING per slot, first come
 * first served).
 */
export const createBaptemeRequest = async (input: CreateBaptemeInput) => {
    const club = await resolveClubByToken(input.clubID, input.token);
    if (!club) return { error: "Lien invalide ou expiré." };

    // Server-side validation of the contact fields (mirrors the client form).
    const parsed = baptemeRequestSchema.safeParse({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        comment: input.comment ?? "",
        sessionID: input.sessionID,
        planeID: input.planeID,
        baptemeOptionID: input.baptemeOptionID ?? "",
    });
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
    }

    const captchaOk = await verifyCaptcha(input.captchaToken);
    if (!captchaOk) return { error: "Vérification anti-robot échouée. Merci de réessayer." };

    const now = new Date();
    // Same guard as when listing: otherwise a form left open (or a forged request)
    // could book a slot that has already started.
    const slotNow = toClubWallClock(now);

    try {
        const session = await prisma.flight_sessions.findUnique({
            where: { id: input.sessionID },
        });
        if (!session || session.clubID !== input.clubID) {
            return { error: "Créneau introuvable." };
        }

        const [planes, busySessions] = await Promise.all([
            prisma.planes.findMany({
                where: { clubID: input.clubID, ownerID: null, operational: true },
            }),
            // Planes already taken at the same time by ANOTHER session: the current session
            // is excluded (its studentPlaneID is null until a hold is placed, but better to
            // be explicit).
            prisma.flight_sessions.findMany({
                where: {
                    clubID: input.clubID,
                    sessionDateStart: session.sessionDateStart,
                    studentPlaneID: { not: null },
                    id: { not: session.id },
                },
                select: { studentPlaneID: true },
            }),
        ]);

        const unavailablePlaneIDs = busySessions
            .map((s) => s.studentPlaneID)
            .filter((id): id is string => id !== null);

        // The slot must still be a free, upcoming discovery slot…
        if (
            !isBaptemeSlotAvailable(
                {
                    studentID: session.studentID,
                    natureOfTheft: session.natureOfTheft,
                    sessionDateStart: session.sessionDateStart,
                    planeID: session.planeID,
                    classes: session.classes,
                },
                planes,
                [],
                now,
                slotNow,
                unavailablePlaneIDs
            )
        ) {
            return { error: "Ce créneau n'est plus disponible." };
        }

        // …and the chosen plane must be a club plane offered on the slot, not already
        // taken at that time by someone else.
        const eligiblePlanes = filterBaptemePlanes(
            planes,
            { planeID: session.planeID, classes: session.classes },
            unavailablePlaneIDs
        );
        const chosenPlane = eligiblePlanes.find((p) => p.id === input.planeID);
        if (!chosenPlane) {
            return { error: "Appareil indisponible pour ce créneau." };
        }

        // Package (duration + price): if the plane offers some, the customer must have
        // picked one (revalidated here: never trust the ID sent without checking it
        // belongs to THIS plane). With no package configured, no choice is expected.
        const planeOptions = await prisma.baptemeOption.findMany({ where: { planeId: chosenPlane.id } });
        let option: { durationMin: number; price: number } | null = null;
        if (planeOptions.length > 0) {
            const chosenOption = planeOptions.find((o) => o.id === parsed.data.baptemeOptionID);
            if (!chosenOption) {
                return { error: "Merci de choisir une formule." };
            }
            option = { durationMin: chosenOption.durationMin, price: chosenOption.price };
        }

        // Anti-double-hold: purge expired holds (which also frees the slot), then reject
        // if an active PENDING remains (first come first served).
        await expireStaleHolds(now, { sessionID: input.sessionID });
        const activeHolds = await prisma.baptemeRequest.findMany({
            where: { sessionID: input.sessionID, status: "PENDING" },
            select: { status: true, expiresAt: true },
        });
        if (hasActiveHold(activeHolds.map((h) => ({ status: "PENDING", expiresAt: h.expiresAt })), now)) {
            return { error: "Ce créneau vient d'être réservé. Merci d'en choisir un autre." };
        }

        const expiresAt = computeHoldExpiry(now);
        const sessionComment = buildBaptemeSessionComment(option, parsed.data.comment || null);
        // Create the request AND occupy the slot (studentID = hold sentinel) in the same
        // transaction: no concurrent booking is possible until the pilot accepts/rejects
        // (or 24 h pass).
        await prisma.$transaction([
            prisma.baptemeRequest.create({
                data: {
                    clubID: input.clubID,
                    sessionID: input.sessionID,
                    planeID: input.planeID,
                    firstName: parsed.data.firstName,
                    lastName: parsed.data.lastName,
                    email: parsed.data.email,
                    phone: parsed.data.phone,
                    comment: parsed.data.comment || null,
                    optionDurationMin: option?.durationMin ?? null,
                    optionPrice: option?.price ?? null,
                    status: "PENDING",
                    expiresAt,
                },
            }),
            prisma.flight_sessions.update({
                where: { id: input.sessionID },
                data: {
                    studentID: BAPTEME_HOLD_STUDENT_ID,
                    studentFirstName: parsed.data.firstName,
                    studentLastName: parsed.data.lastName,
                    studentEmail: parsed.data.email,
                    studentPhone: parsed.data.phone,
                    studentPlaneID: input.planeID,
                    studentComment: sessionComment,
                },
            }),
        ]);

        const start = session.sessionDateStart;
        const end = new Date(start.getTime() + session.sessionDateDuration_min * 60 * 1000);
        const validationLink = `${appUrl()}/dashboard?clubID=${input.clubID}`;
        const optionLabel = option ? formatBaptemeOptionLabel(option) : null;

        // Notify the assigned pilot + acknowledge to the customer (non-blocking).
        const pilot = await prisma.user.findUnique({ where: { id: session.pilotID } });
        await Promise.all([
            pilot?.email
                ? sendBaptemePilotNotification(
                      pilot.email,
                      start,
                      end,
                      input.clubID,
                      chosenPlane.name ?? "Appareil",
                      {
                          firstName: parsed.data.firstName,
                          lastName: parsed.data.lastName,
                          email: parsed.data.email,
                          phone: parsed.data.phone,
                      },
                      parsed.data.comment || null,
                      validationLink,
                      optionLabel
                  )
                : Promise.resolve(),
            sendBaptemeClientReceived(
                parsed.data.email,
                parsed.data.firstName,
                start,
                end,
                input.clubID,
                chosenPlane.name ?? "Appareil",
                optionLabel
            ),
        ]);

        return { success: "Votre demande a bien été envoyée !" };
    } catch {
        return { error: "Erreur lors de l'envoi de votre demande." };
    }
};

// ─── Management actions (WITH requireAuth) ───

/**
 * Pending discovery-flight requests the current user can handle: those where
 * they are the assigned pilot, or all of them for management.
 */
export const getPendingBaptemeRequests = async (clubID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    const now = new Date();

    try {
        // Club-wide lazy expiry (also frees the slots).
        await expireStaleHolds(now, { clubID });

        const requests = await prisma.baptemeRequest.findMany({
            where: { clubID, status: "PENDING" },
            orderBy: { createdAt: "asc" },
        });

        // Only return the requests the user can accept.
        return await buildPendingBaptemeItems(requests, auth.user);
    } catch {
        return { error: "Erreur lors de la récupération des baptêmes en attente." };
    }
};

/**
 * Pending requests on specific slots that the current user can handle. Feeds the
 * validation from the calendar popup: same rights as on the Club page (assigned
 * pilot or management), without leaving the schedule.
 */
export const getPendingBaptemeRequestsBySessions = async (sessionIDs: string[]) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (!auth.user.clubID) return { error: "Permissions insuffisantes" };
    if (sessionIDs.length === 0) return [];

    const now = new Date();

    try {
        // Same lazy expiry as on the Club page: an expired hold must not be offered for
        // validation.
        await expireStaleHolds(now, { clubID: auth.user.clubID });

        const requests = await prisma.baptemeRequest.findMany({
            where: { clubID: auth.user.clubID, status: "PENDING", sessionID: { in: sessionIDs } },
            orderBy: { createdAt: "asc" },
        });

        return await buildPendingBaptemeItems(requests, auth.user);
    } catch {
        return { error: "Erreur lors de la récupération des baptêmes en attente." };
    }
};

/**
 * Lightweight count of pending discovery-flight requests the current user can
 * handle (management => whole club; otherwise => only their slots as assigned
 * pilot). Used by the menu badge. Always returns { count } (0 when unauthorized /
 * on error) to keep the nav simple.
 */
export const getPendingBaptemeCount = async (clubID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { count: 0 };
    if (auth.user.clubID !== clubID) return { count: 0 };

    const now = new Date();
    try {
        await expireStaleHolds(now, { clubID });

        if (BAPTEME_MANAGEMENT_ROLES.includes(auth.user.role)) {
            const count = await prisma.baptemeRequest.count({
                where: { clubID, status: "PENDING" },
            });
            return { count };
        }

        // Assigned pilot: only count requests on their own slots.
        const pending = await prisma.baptemeRequest.findMany({
            where: { clubID, status: "PENDING" },
            select: { sessionID: true },
        });
        if (pending.length === 0) return { count: 0 };
        const count = await prisma.flight_sessions.count({
            where: { id: { in: pending.map((p) => p.sessionID) }, pilotID: auth.user.id },
        });
        return { count };
    } catch {
        return { count: 0 };
    }
};

/**
 * Accepts a request: books the customer on the slot through the "guest"
 * mechanism (studentID = 'invited'), sets the request to CONFIRMED and sends the
 * confirmation email.
 */
export const validateBaptemeRequest = async (requestID: string) => {
    if (!requestID) return { error: "Une erreur est survenue (E_001: requestID manquant)" };

    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };

    const now = new Date();

    try {
        const request = await prisma.baptemeRequest.findUnique({ where: { id: requestID } });
        if (!request || request.clubID !== auth.user.clubID) {
            return { error: "Demande introuvable." };
        }
        if (request.status !== "PENDING") {
            return { error: "Cette demande a déjà été traitée." };
        }

        const session = await prisma.flight_sessions.findUnique({ where: { id: request.sessionID } });
        if (!session) return { error: "Créneau introuvable." };

        if (!canValidateBapteme(auth.user, { pilotID: session.pilotID })) {
            return { error: "Permissions insuffisantes" };
        }
        if (request.expiresAt < now) {
            await prisma.$transaction([
                prisma.baptemeRequest.update({
                    where: { id: requestID },
                    data: { status: "EXPIRED", handledBy: auth.user.id, handledAt: now },
                }),
                prisma.flight_sessions.updateMany({
                    where: { id: session.id, studentID: BAPTEME_HOLD_STUDENT_ID },
                    data: RELEASE_SESSION_DATA,
                }),
            ]);
            return { error: "Cette demande a expiré, le créneau a été rouvert." };
        }
        // The slot must be free OR held by this request's hold.
        if (session.studentID != null && session.studentID !== BAPTEME_HOLD_STUDENT_ID) {
            return { error: "Ce créneau n'est plus disponible." };
        }

        // The package (duration + price denormalized on the request) must appear in the
        // flight comment exactly as when the hold was created
        // (buildBaptemeSessionComment produces the same text on both sides).
        const option =
            request.optionDurationMin != null && request.optionPrice != null
                ? { durationMin: request.optionDurationMin, price: request.optionPrice }
                : null;
        const sessionComment = buildBaptemeSessionComment(option, request.comment);

        // Guest booking + switch to CONFIRMED, in a transaction.
        await prisma.$transaction([
            prisma.flight_sessions.update({
                where: { id: session.id },
                data: {
                    studentID: "invited",
                    studentFirstName: request.firstName,
                    studentLastName: request.lastName,
                    studentEmail: request.email,
                    studentPhone: request.phone,
                    studentPlaneID: request.planeID,
                    studentComment: sessionComment,
                },
            }),
            prisma.baptemeRequest.update({
                where: { id: requestID },
                data: { status: "CONFIRMED", handledBy: auth.user.id, handledAt: now },
            }),
        ]);

        const start = session.sessionDateStart;
        const end = new Date(start.getTime() + session.sessionDateDuration_min * 60 * 1000);
        const plane = await prisma.planes.findUnique({
            where: { id: request.planeID },
            select: { name: true },
        });

        await sendBaptemeClientConfirmed(
            request.email,
            request.firstName,
            start,
            end,
            request.clubID,
            plane?.name ?? "Appareil",
            session.pilotID,
            option ? formatBaptemeOptionLabel(option) : null
        );

        return { success: "Baptême confirmé, le client a été notifié !" };
    } catch {
        return { error: "Erreur lors de la validation du baptême." };
    }
};

/**
 * Rejects a request: sets it to REJECTED (the slot was never filled during the
 * hold, so it is effectively reopened) and sends a polite email.
 */
export const rejectBaptemeRequest = async (requestID: string) => {
    if (!requestID) return { error: "Une erreur est survenue (E_001: requestID manquant)" };

    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };

    const now = new Date();

    try {
        const request = await prisma.baptemeRequest.findUnique({ where: { id: requestID } });
        if (!request || request.clubID !== auth.user.clubID) {
            return { error: "Demande introuvable." };
        }
        if (request.status !== "PENDING") {
            return { error: "Cette demande a déjà été traitée." };
        }

        const session = await prisma.flight_sessions.findUnique({
            where: { id: request.sessionID },
            select: { pilotID: true, sessionDateStart: true, sessionDateDuration_min: true },
        });
        if (!session) return { error: "Créneau introuvable." };
        if (!canValidateBapteme(auth.user, { pilotID: session.pilotID })) {
            return { error: "Permissions insuffisantes" };
        }

        // Rejection + slot reopening (hold released) in one transaction.
        await prisma.$transaction([
            prisma.baptemeRequest.update({
                where: { id: requestID },
                data: { status: "REJECTED", handledBy: auth.user.id, handledAt: now },
            }),
            prisma.flight_sessions.updateMany({
                where: { id: request.sessionID, studentID: BAPTEME_HOLD_STUDENT_ID },
                data: RELEASE_SESSION_DATA,
            }),
        ]);

        const club = await prisma.club.findUnique({
            where: { id: request.clubID },
            select: { publicBookingToken: true },
        });
        const bookingLink = club?.publicBookingToken
            ? `${appUrl()}/reservation/${request.clubID}/${club.publicBookingToken}`
            : null;

        const start = session.sessionDateStart;
        const end = new Date(start.getTime() + session.sessionDateDuration_min * 60 * 1000);
        await sendBaptemeClientRejected(
            request.email,
            request.firstName,
            start,
            end,
            request.clubID,
            bookingLink
        );

        return { success: "La demande a été refusée, le client a été notifié." };
    } catch {
        return { error: "Erreur lors du refus du baptême." };
    }
};

// ─── Public link (read: any member / regenerate: ADMIN-OWNER) ───

/**
 * Returns the club's current public token (null if no active link).
 * Available to ANY club member: the link is meant to be shared (QR code, social
 * media…). Only regenerating it is restricted to president / admin.
 */
export const getPublicBookingToken = async (clubID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    try {
        const club = await prisma.club.findUnique({
            where: { id: clubID },
            select: { publicBookingToken: true },
        });
        return { token: club?.publicBookingToken ?? null };
    } catch {
        return { error: "Erreur lors de la récupération du lien public." };
    }
};

/**
 * (Re)generates the public token: the previous URL stops working immediately.
 * ADMIN / OWNER only.
 */
export const regeneratePublicBookingToken = async (clubID: string) => {
    const auth = await requireAuth(PUBLIC_LINK_MANAGE_ROLES);
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    try {
        const token = randomUUID();
        await prisma.club.update({
            where: { id: clubID },
            data: { publicBookingToken: token },
        });
        return { success: "Le lien public a été régénéré.", token };
    } catch {
        return { error: "Erreur lors de la régénération du lien public." };
    }
};
