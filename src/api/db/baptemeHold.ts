import prisma from "../prisma";
import { BAPTEME_HOLD_STUDENT_ID } from "@/lib/bapteme";

/**
 * Gestion du « hold » qu'une demande de baptême PENDING pose sur un créneau
 * (flight_sessions.studentID = sentinelle). Isolé dans son propre module pour
 * être importable par bapteme.ts, sessions.ts ET users.ts sans créer d'import
 * circulaire (users.ts <-> bapteme.ts via requireAuth).
 *
 * PAS de directive "use server" : ce module n'expose que des helpers internes
 * appelés depuis d'autres modules serveur (jamais depuis un composant client).
 * Un fichier "use server" ne peut exporter que des fonctions async, or on
 * exporte aussi la donnée RELEASE_SESSION_DATA.
 */

// Données de « déblocage » d'un créneau : remet la session à l'état libre.
export const RELEASE_SESSION_DATA = {
    studentID: null,
    studentFirstName: null,
    studentLastName: null,
    studentEmail: null,
    studentPhone: null,
    studentPlaneID: null,
    studentComment: null,
} as const;

/**
 * Expiration paresseuse : passe à EXPIRED les demandes PENDING échues ET libère
 * les créneaux qu'elles tenaient (studentID sentinelle -> null). Scope optionnel
 * par club et/ou par créneau. Exécutée à la lecture / avant toute écriture.
 */
export async function expireStaleHolds(
    now: Date,
    scope: { clubID?: string; sessionID?: string } = {}
) {
    const stale = await prisma.baptemeRequest.findMany({
        where: {
            status: "PENDING",
            expiresAt: { lt: now },
            ...(scope.clubID ? { clubID: scope.clubID } : {}),
            ...(scope.sessionID ? { sessionID: scope.sessionID } : {}),
        },
        select: { id: true, sessionID: true },
    });
    if (stale.length === 0) return;

    await prisma.$transaction([
        prisma.baptemeRequest.updateMany({
            where: { id: { in: stale.map((s) => s.id) } },
            data: { status: "EXPIRED" },
        }),
        prisma.flight_sessions.updateMany({
            where: {
                id: { in: stale.map((s) => s.sessionID) },
                studentID: BAPTEME_HOLD_STUDENT_ID,
            },
            data: RELEASE_SESSION_DATA,
        }),
    ]);
}

/**
 * Libère un créneau si son hold de baptême a expiré, puis indique s'il reste
 * bloqué par un hold ACTIF. Utilisé par les chemins d'inscription classiques
 * (studentRegistration / addStudentToSession) pour empêcher qu'un élève ou un
 * invité ne prenne un créneau tenu par une demande de baptême en attente.
 */
export const resolveBaptemeHold = async (sessionID: string) => {
    if (!sessionID) return { held: false };
    const now = new Date();
    try {
        await expireStaleHolds(now, { sessionID });
        const activeHolds = await prisma.baptemeRequest.count({
            where: { sessionID, status: "PENDING" },
        });
        return { held: activeHolds > 0 };
    } catch {
        // En cas d'erreur, ne pas bloquer l'inscription (fail-open).
        return { held: false };
    }
};
