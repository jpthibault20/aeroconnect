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



// ─── Helpers internes ───

// Valide le couple (clubID, token) contre le jeton public courant du club.
// Renvoie le club si le lien est valide, sinon null.
async function resolveClubByToken(clubID: string, token: string) {
    if (!clubID || !token) return null;
    const club = await prisma.club.findUnique({ where: { id: clubID } });
    if (!club || !club.publicBookingToken) return null;
    if (club.publicBookingToken !== token) return null;
    return club;
}

/**
 * DTO commun aux deux points d'entrée de validation (page Club et popup du
 * calendrier) : la demande enrichie du créneau et de la machine, filtrée sur ce
 * que `user` a le droit de traiter (pilote assigné ou gestion).
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


// ─── Actions publiques (SANS requireAuth) ───

/**
 * Créneaux baptême proposables au public pour un club via son lien.
 * N'expose que des données non sensibles : id du créneau, date, durée et la
 * liste des machines DU CLUB réservables (id + nom). Jamais de machine privée
 * ni de créneau non-baptême.
 */
export const getPublicBaptemeSlots = async (clubID: string, token: string) => {
    const club = await resolveClubByToken(clubID, token);
    if (!club) return { error: "Lien invalide ou expiré." };

    const now = new Date();
    // Les créneaux sont stockés en wall-clock UTC : les comparer à l'instant
    // réel laisserait passer les créneaux dépassés de moins de 2 h l'été.
    const slotNow = toClubWallClock(now);

    // Au-delà de l'horizon, on ne propose rien : la charge utile reste bornée
    // même pour un club qui ouvre des créneaux très à l'avance.
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
            // Machines déjà engagées sur un horaire à venir, toutes natures de
            // vol confondues : baptême concurrent comme réservation d'un membre.
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

        // Indexées par horaire de départ : deux sessions simultanées ne peuvent
        // pas vendre le même appareil.
        const takenPlanesByStart = new Map<number, string[]>();
        for (const s of busySessions) {
            if (!s.studentPlaneID) continue;
            const key = s.sessionDateStart.getTime();
            const list = takenPlanesByStart.get(key) ?? [];
            list.push(s.studentPlaneID);
            takenPlanesByStart.set(key, list);
        }
        const takenAt = (start: Date) => takenPlanesByStart.get(start.getTime()) ?? [];

        // Nom + photo de chaque machine : le client choisit son appareil en le
        // voyant, pas seulement d'après un nom de modèle. L'URL est construite
        // ici (le chemin brut en base n'a aucun sens pour le navigateur).
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
                // Nom du pilote qui assurera le vol : le client choisit son
                // créneau en connaissance de cause. Aucune coordonnée n'est
                // exposée ici (page publique) — elles arrivent dans l'email de
                // confirmation, une fois la demande validée.
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

        // Coordonnées publiques du club : affichées sur la page publique pour que
        // le visiteur puisse joindre le club (adresse, téléphone, email, référent).
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
    // Formule (durée + tarif) choisie parmi celles configurées sur la machine.
    // Absent si la machine n'en a aucune.
    baptemeOptionID?: string;
    captchaToken?: string;
}

/**
 * Crée une demande de baptême PENDING (pose un hold sur le créneau).
 * Sans authentification : on revalide intégralement clubID / token / créneau /
 * machine + captcha, et on applique l'anti-double-hold (un seul PENDING actif
 * par créneau, premier arrivé gagne).
 */
export const createBaptemeRequest = async (input: CreateBaptemeInput) => {
    const club = await resolveClubByToken(input.clubID, input.token);
    if (!club) return { error: "Lien invalide ou expiré." };

    // Validation serveur des champs de contact (miroir du formulaire client).
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
    // Même précaution qu'à l'affichage : sans ça un formulaire laissé ouvert
    // (ou une requête forgée) permet de réserver un créneau déjà commencé.
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
            // Machines déjà engagées au même horaire par une AUTRE session : la
            // session courante est exclue (son propre studentPlaneID est nul
            // tant qu'aucun hold n'est posé, mais autant être explicite).
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

        // Le créneau doit encore être un baptême libre et futur…
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

        // …et la machine choisie doit être une machine club proposée sur le
        // créneau, et pas déjà prise à cet horaire par quelqu'un d'autre.
        const eligiblePlanes = filterBaptemePlanes(
            planes,
            { planeID: session.planeID, classes: session.classes },
            unavailablePlaneIDs
        );
        const chosenPlane = eligiblePlanes.find((p) => p.id === input.planeID);
        if (!chosenPlane) {
            return { error: "Appareil indisponible pour ce créneau." };
        }

        // Formule (durée + tarif) : si la machine en propose, le client doit en
        // avoir choisi une (revalidée ici — jamais fait confiance à l'ID envoyé
        // sans vérifier qu'il appartient bien à CETTE machine). Sans formule
        // configurée côté machine, aucun choix n'est attendu.
        const planeOptions = await prisma.baptemeOption.findMany({ where: { planeId: chosenPlane.id } });
        let option: { durationMin: number; price: number } | null = null;
        if (planeOptions.length > 0) {
            const chosenOption = planeOptions.find((o) => o.id === parsed.data.baptemeOptionID);
            if (!chosenOption) {
                return { error: "Merci de choisir une formule." };
            }
            option = { durationMin: chosenOption.durationMin, price: chosenOption.price };
        }

        // Anti-double-hold : on purge les holds expirés (ce qui libère aussi le
        // créneau), puis on refuse s'il reste un PENDING actif (1er arrivé gagne).
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
        // On crée la demande ET on occupe le créneau (studentID = sentinelle de
        // hold) dans la même transaction : plus aucune inscription concurrente
        // possible tant que le pilote n'a pas validé/refusé (ou 24 h écoulées).
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

        // Notifie le pilote assigné + accuse réception au client (non bloquant).
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

// ─── Actions de gestion (AVEC requireAuth) ───

/**
 * Demandes de baptême en attente que l'utilisateur courant peut traiter :
 * celles dont il est le pilote assigné, ou toutes s'il est gestion.
 */
export const getPendingBaptemeRequests = async (clubID: string) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    const now = new Date();

    try {
        // Expiration paresseuse à l'échelle du club (libère aussi les créneaux).
        await expireStaleHolds(now, { clubID });

        const requests = await prisma.baptemeRequest.findMany({
            where: { clubID, status: "PENDING" },
            orderBy: { createdAt: "asc" },
        });

        // Ne renvoie que les demandes que l'utilisateur peut valider.
        return await buildPendingBaptemeItems(requests, auth.user);
    } catch {
        return { error: "Erreur lors de la récupération des baptêmes en attente." };
    }
};

/**
 * Demandes en attente portant sur des créneaux précis, que l'utilisateur courant
 * peut traiter. Alimente la validation depuis la popup du calendrier : les mêmes
 * droits qu'en page Club (pilote assigné ou gestion), sans l'obliger à quitter
 * son planning pour valider un baptême qu'il a sous les yeux.
 */
export const getPendingBaptemeRequestsBySessions = async (sessionIDs: string[]) => {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (!auth.user.clubID) return { error: "Permissions insuffisantes" };
    if (sessionIDs.length === 0) return [];

    const now = new Date();

    try {
        // Même expiration paresseuse qu'en page Club : un hold échu ne doit pas
        // rester proposé à la validation.
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
 * Compteur léger des baptêmes en attente que l'utilisateur courant peut traiter
 * (gestion => tout le club ; sinon => uniquement ses créneaux en tant que
 * pilote assigné). Sert au badge de notification du menu. Renvoie toujours un
 * objet { count } (0 si non autorisé / erreur) pour rester simple côté nav.
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

        // Pilote assigné : ne compter que les demandes portant sur ses créneaux.
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
 * Valide une demande : inscrit le client dans le créneau via le mécanisme
 * « invité » (studentID = 'invited'), passe la demande à CONFIRMED et envoie
 * l'email de confirmation soigné.
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
        // Le créneau doit être libre OU tenu par le hold de cette demande.
        if (session.studentID != null && session.studentID !== BAPTEME_HOLD_STUDENT_ID) {
            return { error: "Ce créneau n'est plus disponible." };
        }

        // La formule (durée + tarif dénormalisés sur la demande) doit apparaître
        // dans le commentaire du vol exactement comme lors de la création du hold
        // (buildBaptemeSessionComment produit le même texte des deux côtés).
        const option =
            request.optionDurationMin != null && request.optionPrice != null
                ? { durationMin: request.optionDurationMin, price: request.optionPrice }
                : null;
        const sessionComment = buildBaptemeSessionComment(option, request.comment);

        // Inscription via le mécanisme invité + passage à CONFIRMED, en transaction.
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
 * Refuse une demande : passe à REJECTED (le créneau n'ayant jamais été rempli
 * pendant le hold, il est de fait rouvert) et envoie un email courtois.
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

        // Refus + réouverture du créneau (le hold est levé) en une transaction.
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

// ─── Lien public (lecture : tout membre / régénération : ADMIN-OWNER) ───

/**
 * Renvoie le jeton public courant du club (null si aucun lien actif).
 * Accessible à TOUT membre du club : le lien est fait pour être diffusé, chaque
 * membre doit pouvoir le partager (QR code, réseaux sociaux…). Seule sa
 * régénération reste réservée au président / admin.
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
 * (Ré)génère le jeton public : l'ancienne URL cesse immédiatement de
 * fonctionner. Réservé ADMIN / OWNER.
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
