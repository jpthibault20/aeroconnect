import { NatureOfTheft, userRole } from "@prisma/client";
import { formatSessionDate, formatSessionTime } from "@/api/global function/dateServeur";

/**
 * Règles (pures, testées) de la réservation publique de vols baptême.
 *
 * Factorisé hors des server actions / composants pour être partagé entre le
 * code et les tests (cf. convention CLAUDE.md). Aucune de ces fonctions ne
 * touche Prisma : elles opèrent sur des objets « *Like » minimalistes, ce qui
 * les rend testables avec des objets construits à la main.
 *
 * Le marqueur « ce créneau est un baptême » est la présence de DISCOVERY dans
 * `flight_sessions.natureOfTheft` (tableau). `flightType` n'est pas utilisé.
 */

// Rôles de gestion habilités à valider/refuser une demande de baptême, en plus
// du pilote assigné au créneau.
export const BAPTEME_MANAGEMENT_ROLES: userRole[] = [
    userRole.OWNER,
    userRole.ADMIN,
    userRole.MANAGER,
];

// Rôles habilités à gérer (régénérer) le lien public de réservation.
export const PUBLIC_LINK_MANAGE_ROLES: userRole[] = [
    userRole.ADMIN,
    userRole.OWNER,
];

// Sentinelle posée sur flight_sessions.studentID pour « tenir » un créneau
// pendant qu'une demande de baptême est PENDING (hold). Elle bloque toute
// inscription concurrente (élève ou invité) et déclenche l'affichage du libellé
// « baptême en attente » dans le calendrier. Distincte de "invited" (client
// confirmé après validation).
export const BAPTEME_HOLD_STUDENT_ID = "bapteme-hold";

// Durée de vie du « hold » posé par une demande PENDING : le pilote (ou la
// gestion) dispose de 24 h pour valider avant que la demande n'expire et que le
// créneau ne soit rouvert. Vit ici (module pur) et non dans le server action
// bapteme.ts, qui est "use server" et ne peut exporter que des fonctions async.
export const HOLD_TTL_MINUTES = 24 * 60;

// Échéance d'un hold créé à l'instant `now`.
export function computeHoldExpiry(now: Date): Date {
    return new Date(now.getTime() + HOLD_TTL_MINUTES * 60 * 1000);
}

// Valeurs possibles du statut d'une demande (miroir de l'enum Prisma
// BaptemeStatus, redéclaré ici pour garder ce module découplé du client généré).
export type BaptemeStatusValue = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED";

export type BaptemeAction = "validate" | "reject" | "expire";

// Forme minimale d'un créneau nécessaire aux règles de disponibilité.
export interface BaptemeSlotLike {
    studentID: string | null;
    natureOfTheft: NatureOfTheft[];
    sessionDateStart: Date | string;
    planeID: string[];
    classes: number[];
}

// Forme minimale d'une machine.
export interface BaptemePlaneLike {
    id: string;
    ownerID: string | null;
    operational: boolean;
    classes: number;
}

// Forme minimale d'une demande de baptême.
export interface BaptemeRequestLike {
    status: BaptemeStatusValue;
    expiresAt: Date | string;
}

function toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

/**
 * Une demande PENDING dont l'échéance est passée est expirée (expiration
 * paresseuse). Les statuts CONFIRMED / REJECTED / EXPIRED sont ignorés (jamais
 * « expirés » au sens du hold — ils ne bloquent plus le créneau).
 */
export function isHoldExpired(req: BaptemeRequestLike, now: Date): boolean {
    if (req.status !== "PENDING") return false;
    return toDate(req.expiresAt).getTime() < now.getTime();
}

/**
 * Y a-t-il un hold actif (une demande PENDING non expirée) parmi ces demandes ?
 * Sert à masquer un créneau déjà « tenu » par un premier client.
 */
export function hasActiveHold(requests: BaptemeRequestLike[], now: Date): boolean {
    return requests.some((r) => r.status === "PENDING" && !isHoldExpired(r, now));
}

/**
 * Machines proposables au public pour un créneau baptême : uniquement les
 * machines DU CLUB (ownerID == null, jamais une machine privée), opérationnelles,
 * effectivement offertes sur le créneau (présentes dans slot.planeID) et
 * compatibles avec les classes autorisées du créneau (si le créneau restreint
 * les classes).
 *
 * `unavailablePlaneIDs` liste les machines déjà prises à ce même horaire par une
 * AUTRE session — baptême concurrent ou réservation d'un membre. Sans ce filtre,
 * deux créneaux simultanés portés par des pilotes différents peuvent vendre le
 * même appareil (et le public ignorerait les réservations internes). Même règle
 * que `filterPlanesForBeneficiary` côté membres.
 */
export function filterBaptemePlanes<T extends BaptemePlaneLike>(
    planes: T[],
    slot: Pick<BaptemeSlotLike, "planeID" | "classes">,
    unavailablePlaneIDs: string[] = []
): T[] {
    const unavailable = new Set(unavailablePlaneIDs);
    return planes.filter(
        (plane) =>
            plane.ownerID == null &&
            plane.operational &&
            !unavailable.has(plane.id) &&
            slot.planeID.includes(plane.id) &&
            (slot.classes.length === 0 || slot.classes.includes(plane.classes))
    );
}

/**
 * Un créneau est-il proposable au public ? Il faut :
 *  - qu'il soit marqué baptême (natureOfTheft contient DISCOVERY) ;
 *  - qu'il soit libre (studentID == null) ;
 *  - qu'il n'ait aucun hold PENDING actif ;
 *  - qu'il soit dans le futur ;
 *  - qu'au moins une machine club opérationnelle et compatible soit disponible.
 *
 * Deux référentiels de temps cohabitent, et les confondre laisse un créneau
 * dépassé réservable pendant la durée de l'offset (2 h en France l'été) :
 *  - `now` : instant réel, pour l'expiration des holds (une durée de 24 h) ;
 *  - `slotNow` : heure de pendule du club, pour comparer à `sessionDateStart`
 *    qui est stockée en wall-clock UTC (cf. src/lib/clubTime.ts).
 * `slotNow` vaut `now` par défaut : les deux ne diffèrent que côté serveur, là
 * où l'appelant sait convertir.
 */
export function isBaptemeSlotAvailable(
    slot: BaptemeSlotLike,
    planes: BaptemePlaneLike[],
    requests: BaptemeRequestLike[],
    now: Date,
    slotNow: Date = now,
    unavailablePlaneIDs: string[] = []
): boolean {
    if (!slot.natureOfTheft.includes(NatureOfTheft.DISCOVERY)) return false;
    if (slot.studentID != null) return false;
    if (toDate(slot.sessionDateStart).getTime() <= slotNow.getTime()) return false;
    if (hasActiveHold(requests, now)) return false;
    // Un créneau dont toutes les machines sont déjà prises à cet horaire n'est
    // plus proposable : il disparaît de lui-même de la page publique.
    return filterBaptemePlanes(planes, slot, unavailablePlaneIDs).length > 0;
}

/**
 * Qui peut valider/refuser une demande de baptême : le pilote assigné au créneau
 * OU un rôle de gestion (président / admin / manager).
 */
export function canValidateBapteme(
    user: { id: string; role: userRole },
    slot: { pilotID: string }
): boolean {
    if (BAPTEME_MANAGEMENT_ROLES.includes(user.role)) return true;
    return user.id === slot.pilotID;
}

/**
 * Qui peut gérer (régénérer) le lien public : admin et président uniquement.
 */
export function canManagePublicLink(role: userRole): boolean {
    return PUBLIC_LINK_MANAGE_ROLES.includes(role);
}

/**
 * Types de vol à écrire sur un créneau selon l'interrupteur « baptême » de la
 * création de séance. DISCOVERY est le SEUL marqueur exploité (c'est lui que
 * getPublicBaptemeSlots interroge) : décoché, on ne laisse rien traîner.
 */
export function natureOfTheftForBapteme(isBapteme: boolean): NatureOfTheft[] {
    return isBapteme ? [NatureOfTheft.DISCOVERY] : [];
}

/** Un créneau porte-t-il le marqueur baptême ? */
export function isBaptemeSlot(natureOfTheft: NatureOfTheft[]): boolean {
    return natureOfTheft.includes(NatureOfTheft.DISCOVERY);
}

/**
 * Nom du pilote tel qu'affiché au client (page publique ET email de
 * confirmation) : prénom puis nom en capitales.
 */
export function formatPilotName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName.toUpperCase()}`.trim();
}

// Horizon de la réservation publique : au-delà, les créneaux ne sont pas
// proposés. Borne la charge utile envoyée au navigateur (un gros club peut avoir
// plusieurs centaines de créneaux baptême ouverts) et évite d'engager le club
// sur une date lointaine.
export const PUBLIC_BOOKING_HORIZON_DAYS = 60;

// Forme minimale d'un créneau pour le regroupement de la page publique.
export interface GroupableSlotLike {
    sessionID: string;
    sessionDateStart: Date | string;
    durationMin: number;
    pilotFirstName: string;
    pilotLastName: string;
}

// Un horaire de la journée. Plusieurs sessions peuvent le partager : autant de
// pilotes proposant un baptême à la même heure.
export interface BaptemeTimeGroup<T extends GroupableSlotLike> {
    timeKey: string;
    sessionDateStart: Date;
    durationMin: number;
    sessions: T[];
}

export interface BaptemeDayGroup<T extends GroupableSlotLike> {
    dayKey: string;
    date: Date;
    times: BaptemeTimeGroup<T>[];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Clés construites sur les composantes UTC : les créneaux sont stockés en
// wall-clock UTC, une lecture locale regrouperait mal (et changerait de jour
// pour les créneaux de fin de soirée).
export function baptemeDayKey(date: Date | string): string {
    const d = toDate(date);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function baptemeTimeKey(date: Date | string): string {
    const d = toDate(date);
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/**
 * Regroupe les créneaux publics par jour, puis par horaire.
 *
 * Une liste à plat ne tient pas à l'échelle : un club à 3 pilotes proposant
 * 8 créneaux par jour sur deux mois produit des centaines d'entrées, dont
 * beaucoup portent le même horaire. Le client choisit donc un jour, puis une
 * heure ; les pilotes proposant cette heure sont regroupés dessous.
 *
 * Fonction pure, triée de façon déterministe (jour croissant, puis heure
 * croissante) : l'ordre ne dépend pas de celui reçu du serveur.
 */
export function groupBaptemeSlots<T extends GroupableSlotLike>(slots: T[]): BaptemeDayGroup<T>[] {
    const days = new Map<string, Map<string, BaptemeTimeGroup<T>>>();

    for (const slot of slots) {
        const start = toDate(slot.sessionDateStart);
        const dayKey = baptemeDayKey(start);
        const timeKey = baptemeTimeKey(start);

        let times = days.get(dayKey);
        if (!times) {
            times = new Map();
            days.set(dayKey, times);
        }

        const group = times.get(timeKey);
        if (group) {
            group.sessions.push(slot);
        } else {
            times.set(timeKey, {
                timeKey,
                sessionDateStart: start,
                durationMin: slot.durationMin,
                sessions: [slot],
            });
        }
    }

    return Array.from(days.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, times]) => ({
            dayKey,
            // Toutes les sessions du jour partagent la même date : on prend
            // celle du premier horaire pour l'affichage du libellé.
            date: Array.from(times.values())[0].sessionDateStart,
            times: Array.from(times.values()).sort((a, b) => a.timeKey.localeCompare(b.timeKey)),
        }));
}

/**
 * Points d'entrée de la réservation publique. Un client vient rarement avec le
 * même critère en tête : certains ont une date impérative, d'autres veulent
 * « le petit rouge » vu sur la photo, d'autres encore un pilote qu'on leur a
 * recommandé. L'ordre des étapes suit le critère choisi, ce qui évite de leur
 * faire parcourir des listes hors sujet.
 */
export type BaptemeEntryPoint = "date" | "plane" | "pilot";

/**
 * Machines distinctes proposées, toutes dates confondues. Sert de première
 * étape à l'entrée « par appareil ». Triées par nom pour un ordre stable.
 */
export function listBaptemePlanes<P extends { id: string; name: string }>(
    slots: { planes: P[] }[]
): P[] {
    const byID = new Map<string, P>();
    for (const slot of slots) {
        for (const plane of slot.planes) {
            if (!byID.has(plane.id)) byID.set(plane.id, plane);
        }
    }
    return Array.from(byID.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export interface BaptemePilotOption {
    key: string;
    firstName: string;
    lastName: string;
}

/**
 * Identifiant public d'un pilote. On s'appuie sur son nom affiché plutôt que
 * sur son id interne, qui n'a pas à sortir sur une page anonyme. Deux pilotes
 * strictement homonymes seraient donc fusionnés — de toute façon indiscernables
 * pour le client.
 */
export function baptemePilotKey(firstName: string, lastName: string): string {
    return formatPilotName(firstName, lastName);
}

/** Pilotes distincts proposant au moins un créneau. */
export function listBaptemePilots(
    slots: Pick<GroupableSlotLike, "pilotFirstName" | "pilotLastName">[]
): BaptemePilotOption[] {
    const byKey = new Map<string, BaptemePilotOption>();
    for (const slot of slots) {
        const key = baptemePilotKey(slot.pilotFirstName, slot.pilotLastName);
        if (!byKey.has(key)) {
            byKey.set(key, { key, firstName: slot.pilotFirstName, lastName: slot.pilotLastName });
        }
    }
    return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key, "fr"));
}

// Forme minimale d'un créneau pour construire son libellé public.
export interface BaptemeSlotLabelLike {
    sessionDateStart: Date | string;
    durationMin: number;
    pilotFirstName: string;
    pilotLastName: string;
}

/**
 * Libellé d'un créneau dans le sélecteur public :
 * « mercredi 12 août · 14:00 → 15:00 · Luc DUPONT ».
 *
 * Les horaires passent par formatSessionDate/Time (lecture UTC) : les créneaux
 * sont stockés en « wall-clock UTC », un formatage local décalerait l'affichage
 * selon le fuseau du visiteur.
 */
export function formatBaptemeSlotLabel(slot: BaptemeSlotLabelLike): string {
    const start = toDate(slot.sessionDateStart);
    const end = new Date(start.getTime() + slot.durationMin * 60 * 1000);
    const pilot = formatPilotName(slot.pilotFirstName, slot.pilotLastName);
    return `${formatSessionDate(start)} · ${formatSessionTime(start)} → ${formatSessionTime(end)} · ${pilot}`;
}

/**
 * Transition de statut d'une demande. Seule une demande PENDING peut évoluer ;
 * toute action sur une demande déjà traitée renvoie une erreur (garde
 * d'idempotence : empêche une double-validation concurrente).
 */
export function nextBaptemeStatus(
    current: BaptemeStatusValue,
    action: BaptemeAction
): BaptemeStatusValue | { error: string } {
    if (current !== "PENDING") {
        return { error: "Cette demande a déjà été traitée." };
    }
    switch (action) {
        case "validate":
            return "CONFIRMED";
        case "reject":
            return "REJECTED";
        case "expire":
            return "EXPIRED";
    }
}
