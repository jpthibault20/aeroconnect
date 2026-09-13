import { flightNature, instructionSubType, pilotFunction, userRole } from "@prisma/client";

const INSTRUCTOR_ROLES: userRole[] = [
    userRole.INSTRUCTOR,
    userRole.OWNER,
    userRole.ADMIN,
];

export function isInstructorRole(role: userRole): boolean {
    return INSTRUCTOR_ROLES.includes(role);
}

// pilotFunction est déduit de la nature du vol + du rôle de l'utilisateur qui
// crée l'entrée. Plus d'input direct côté UI.
export function derivePilotFunction(
    nature: flightNature,
    userRoleValue: userRole
): pilotFunction {
    if (nature === "CDB") return "P";
    return isInstructorRole(userRoleValue) ? "I" : "EP";
}

// ─── Format de saisie du compteur moteur (hobbs) ───
// Tous les hobbs sont STOCKÉS en heures décimales (123,5 = 123 h 30 min) : c'est
// la source-of-truth unique sur laquelle reposent computeDurationMinutes et
// plane.hobbsTotal. Le format ci-dessous ne concerne QUE la saisie/l'affichage
// dans les popups : certains compteurs s'affichent en décimal, d'autres en
// HH:MM (123,30 = 123 h 30 min). La conversion vers le décimal canonique se fait
// à la saisie (cf. HobbsInput) pour ne rien changer au reste de l'application.
export type HobbsFormat = "HMS" | "DECIMAL";

// Décompose des heures décimales en heures entières + minutes (0-59).
// 123,5 -> { hours: 123, minutes: 30 }
export function decimalToHoursMinutes(value: number): { hours: number; minutes: number } {
    const totalMinutes = Math.round(value * 60);
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

// Recompose des heures + minutes en heures décimales canoniques (valeur stockée).
// (123, 30) -> 123,5. Arrondi à 4 décimales pour garder des nombres propres
// (1/60 = 0,0166… non terminant) tout en conservant la résolution à la minute.
export function hoursMinutesToDecimal(hours: number, minutes: number): number {
    return Math.round((hours + minutes / 60) * 1e4) / 1e4;
}

export interface HobbsParseResult {
    // Heures décimales canoniques, ou null si vide / invalide.
    decimal: number | null;
    // true uniquement en HH:MM quand la partie minutes est >= 60.
    minutesInvalid: boolean;
}

// Interprète une saisie HH:MM. Séparateur libre : « , », « . » ou « : » (le
// point et la virgule sont sur le clavier numérique mobile). Les chiffres après
// le séparateur sont des MINUTES (0-59), pas une fraction décimale.
//   "123"     -> 123 h 00
//   "123,30"  -> 123 h 30   (idem "123.30" / "123:30")
//   "123,5"   -> 123 h 05
//   "123,75"  -> minutes invalides
function parseHmsInput(raw: string): HobbsParseResult {
    const s = raw.trim();
    if (s === "") return { decimal: null, minutesInvalid: false };

    const withSep = s.match(/^(\d+)\s*[.,:]\s*(\d*)$/);
    if (withSep) {
        const hours = parseInt(withSep[1], 10);
        const minStr = withSep[2];
        const minutes = minStr === "" ? 0 : parseInt(minStr, 10);
        if (minutes > 59) return { decimal: null, minutesInvalid: true };
        return { decimal: hoursMinutesToDecimal(hours, minutes), minutesInvalid: false };
    }

    const onlyHours = s.match(/^\d+$/);
    if (onlyHours) {
        return { decimal: hoursMinutesToDecimal(parseInt(s, 10), 0), minutesInvalid: false };
    }

    return { decimal: null, minutesInvalid: false };
}

function parseDecimalInput(raw: string): HobbsParseResult {
    const s = raw.trim().replace(",", ".");
    if (s === "") return { decimal: null, minutesInvalid: false };
    const v = parseFloat(s);
    return { decimal: isNaN(v) ? null : v, minutesInvalid: false };
}

// Parse une saisie utilisateur (popups) vers des heures décimales canoniques.
export function parseHobbsInput(raw: string, format: HobbsFormat): HobbsParseResult {
    return format === "HMS" ? parseHmsInput(raw) : parseDecimalInput(raw);
}

// Heures décimales canoniques -> chaîne affichée dans le champ selon le format.
export function formatHobbsValue(value: number | null, format: HobbsFormat): string {
    if (value == null) return "";
    if (format === "DECIMAL") return String(value);
    const { hours, minutes } = decimalToHoursMinutes(value);
    return `${hours}:${String(minutes).padStart(2, "0")}`;
}

// Durée en minutes : calculée à la volée depuis les heures moteur. Pas stockée
// en DB pour rester source-of-truth unique (hobbs).
export function computeDurationMinutes(
    hobbsStart: number | null | undefined,
    hobbsEnd: number | null | undefined
): number {
    if (hobbsStart == null || hobbsEnd == null) return 0;
    const diff = hobbsEnd - hobbsStart;
    if (diff <= 0) return 0;
    return Math.round(diff * 60);
}

// ─── Compteur moteur de l'aéronef (plane.hobbsTotal) ───
// Invariant : le compteur ne recule JAMAIS par effet de bord d'une saisie.
// Chaque entrée de carnet est une lecture du compteur physique par le pilote :
// son hobbsStart est figé à la création (= compteur courant), et sa fin fait
// avancer le compteur dès la création, signée ou non, pour que le pilote
// suivant voie un début à jour. La signature ne fait que verrouiller l'entrée.
//
// Signer/créer un vol antérieur APRÈS un vol postérieur (fin plus petite que
// le compteur) ne doit donc pas ramener le compteur en arrière — c'est
// exactement le bug qui a corrompu les débuts de tous les vols suivants.

// Égalité de deux lectures de compteur (valeurs arrondies à 4 décimales,
// cf. hoursMinutesToDecimal) avec une tolérance sous la minute.
function sameHobbs(a: number, b: number): boolean {
    return Math.abs(a - b) < 1e-6;
}

// Nouveau compteur après création ou modification d'une entrée.
//   current     : plane.hobbsTotal courant (null = compteur inconnu)
//   previousEnd : hobbsEnd stocké de l'entrée AVANT modification (null en création)
//   nextEnd     : hobbsEnd après modification (null = inchangé / non saisi)
// Si l'entrée était « en tête » (sa fin précédente EST le compteur courant),
// sa nouvelle fin remplace le compteur : c'est le seul cas où il peut
// baisser, et c'est une correction explicite de la dernière lecture (faute
// de frappe). Sinon : max(courant, fin), jamais de recul.
export function advanceHobbsTotal(
    current: number | null | undefined,
    previousEnd: number | null | undefined,
    nextEnd: number | null | undefined
): number | null {
    if (nextEnd == null) return current ?? null;
    if (current == null) return nextEnd;
    if (previousEnd != null && sameHobbs(previousEnd, current)) return nextEnd;
    return Math.max(current, nextEnd);
}

// Compteur après suppression d'une entrée (non signée). Si elle était en
// tête, on revient à son début (dernière lecture connue avant ce vol) ; sinon
// un autre vol a déjà poussé le compteur plus loin et on n'y touche pas.
export function rollbackHobbsTotal(
    current: number | null | undefined,
    log: { hobbsStart: number | null; hobbsEnd: number | null }
): number | null {
    if (current == null || log.hobbsEnd == null) return current ?? null;
    if (!sameHobbs(log.hobbsEnd, current)) return current;
    return log.hobbsStart ?? current;
}

// ─── Règles de résolution du début (hobbsStart) côté serveur ───
// Extraites des server actions createFlightLog / updateFlightLog /
// signFlightLog pour être testables sans base.

export const HOBBS_END_BEFORE_START_ERROR =
    "Les heures moteur de fin doivent être supérieures à celles de début";
export const HOBBS_START_UNRESOLVED_ERROR =
    "Impossible de déterminer l'heure moteur de début : le compteur de l'aéronef est déjà au-delà de la fin saisie. Un président ou un administrateur doit renseigner l'heure de début.";

export type HobbsRuleResult<T> = ({ ok: true } & T) | { ok: false; error: string };

// fin > début, uniquement quand les deux sont connus.
export function validateHobbsRange(
    hobbsStart: number | null | undefined,
    hobbsEnd: number | null | undefined
): HobbsRuleResult<object> {
    if (hobbsEnd != null && hobbsStart != null && hobbsEnd <= hobbsStart) {
        return { ok: false, error: HOBBS_END_BEFORE_START_ERROR };
    }
    return { ok: true };
}

// Création : le début est le compteur courant de la machine, point. La valeur
// envoyée par le client n'est prise en compte que :
//  - par un OWNER/ADMIN (override, mauvaise pratique assumée : correction de
//    saisie ou vol antérieur saisi en retard) ;
//  - quand le compteur est inconnu (machine jamais loguée) : la première
//    entrée l'initialise avec la valeur lue sur l'aéronef, quel que soit le rôle.
export function resolveCreateHobbsStart(args: {
    planeHobbsTotal: number | null;
    requested: number | undefined;
    canOverride: boolean;
}): number | null {
    if (args.requested !== undefined && (args.canOverride || args.planeHobbsTotal == null)) {
        return args.requested;
    }
    return args.planeHobbsTotal;
}

// Modification : seul un OWNER/ADMIN peut toucher au début ; pour les autres
// rôles la valeur envoyée est ignorée silencieusement (le client est censé
// bloquer le champ) et la validation se fait contre le début stocké.
// startOverride : valeur à écrire en base (undefined = ne pas toucher).
export function resolveUpdateHobbs(args: {
    existing: { hobbsStart: number | null; hobbsEnd: number | null };
    requestedStart: number | undefined;
    requestedEnd: number | undefined;
    canOverride: boolean;
}): HobbsRuleResult<{ hobbsStart: number | null; hobbsEnd: number | null; startOverride: number | undefined }> {
    const startOverride = args.canOverride ? args.requestedStart : undefined;
    const hobbsStart = startOverride !== undefined ? startOverride : args.existing.hobbsStart;
    const hobbsEnd = args.requestedEnd !== undefined ? args.requestedEnd : args.existing.hobbsEnd;
    const range = validateHobbsRange(hobbsStart, hobbsEnd);
    if (!range.ok) return range;
    return { ok: true, hobbsStart, hobbsEnd, startOverride };
}

// Signature : le début a normalement été figé à la création. Reste le cas des
// entrées historiques (auto-créées, début null) : on le fige sur le compteur
// courant si c'est encore cohérent (compteur < fin), sinon le compteur a déjà
// dépassé ce vol et seul un OWNER/ADMIN peut renseigner le début à la main.
export function resolveSignHobbsStart(args: {
    logStart: number | null;
    logEnd: number | null;
    planeHobbsTotal: number | null;
}): HobbsRuleResult<{ hobbsStart: number | null }> {
    if (args.logStart != null) return { ok: true, hobbsStart: args.logStart };
    const hobbsStart = args.planeHobbsTotal;
    if (hobbsStart != null && args.logEnd != null && args.logEnd <= hobbsStart) {
        return { ok: false, error: HOBBS_START_UNRESOLVED_ERROR };
    }
    return { ok: true, hobbsStart };
}

export interface FlightTimes {
    durationMinutes: number;
    timeDC: number;
    timePIC: number;
    timeInstructor: number;
}

export function computeFlightTimes(log: {
    hobbsStart: number | null;
    hobbsEnd: number | null;
    pilotFunction: pilotFunction;
}): FlightTimes {
    const duration = computeDurationMinutes(log.hobbsStart, log.hobbsEnd);
    return {
        durationMinutes: duration,
        timeDC: log.pilotFunction === "EP" ? duration : 0,
        timePIC: log.pilotFunction === "P" ? duration : 0,
        timeInstructor: log.pilotFunction === "I" ? duration : 0,
    };
}

export interface FlightTimesResolved extends FlightTimes {
    // true quand la durée a été estimée avec un début provisoire (vol non signé,
    // hobbsStart pas encore figé). À NE PAS compter dans les totaux/export officiels.
    provisional: boolean;
}

// Comme computeFlightTimes, mais pour un vol non signé (hobbsStart === null),
// on utilise le hobbs courant de l'avion comme début provisoire afin d'afficher
// une durée INDICATIVE dans le tableau, cohérente avec l'aperçu de la popup.
// hobbsStart est figé définitivement à la signature (cf. signFlightLog).
export function computeFlightTimesWithFallback(
    log: {
        hobbsStart: number | null;
        hobbsEnd: number | null;
        pilotFunction: pilotFunction;
    },
    provisionalStart: number | null | undefined
): FlightTimesResolved {
    if (log.hobbsStart != null) {
        return { ...computeFlightTimes(log), provisional: false };
    }
    const times = computeFlightTimes({
        hobbsStart: provisionalStart ?? null,
        hobbsEnd: log.hobbsEnd,
        pilotFunction: log.pilotFunction,
    });
    return { ...times, provisional: times.durationMinutes > 0 };
}

// Validation de la cohérence nature / sous-type.
export function validateNatureSubType(
    nature: flightNature,
    subType: instructionSubType | null | undefined
): { ok: true } | { ok: false; error: string } {
    if (nature === "INSTRUCTION" && !subType) {
        return { ok: false, error: "Un sous-type est requis pour un vol d'instruction" };
    }
    if (nature === "CDB" && subType) {
        return { ok: false, error: "Un sous-type n'est pas attendu pour un vol en commandant de bord" };
    }
    return { ok: true };
}

export const NATURE_LABELS: Record<flightNature, string> = {
    CDB: "Commandant de bord",
    INSTRUCTION: "Instruction",
};

export const INSTRUCTION_SUBTYPE_LABELS: Record<instructionSubType, string> = {
    LOCAL: "Local",
    NAVIGATION: "Navigation",
    LACHE: "Lâché",
    BAPTEME: "Baptême",
    EXAM: "Examen",
};

// Libellé court (pour les tableaux et PDF).
export function formatNature(
    nature: flightNature,
    subType: instructionSubType | null
): string {
    if (nature === "CDB") return "CdB";
    if (!subType) return "Instruction";
    return `Instr. (${INSTRUCTION_SUBTYPE_LABELS[subType]})`;
}

// Libellé long pour affichage détaillé.
export function formatNatureLong(
    nature: flightNature,
    subType: instructionSubType | null
): string {
    if (nature === "CDB") return "Commandant de bord";
    if (!subType) return "Instruction";
    return `Instruction — ${INSTRUCTION_SUBTYPE_LABELS[subType]}`;
}
