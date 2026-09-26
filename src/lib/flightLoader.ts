/**
 * Animation de chargement « avion qui décolle puis atterrit » (AER-70).
 *
 * Tout ce qui décide de la trajectoire est ici, en fonctions pures du temps :
 * le composant (src/components/loader/) se contente de projeter une pose sur
 * le SVG. Deux loaders qui lisent la même horloge affichent donc exactement la
 * même image, ce qui permet de passer d'un loader à l'autre (loading.tsx →
 * Suspense → InitialLoading → chargement client) sans saut visible.
 *
 * Conventions :
 * - `altitude` va de 0 (roues sur la piste) à 1 (croisière) ;
 * - `pitch` est en degrés, négatif = nez haut (sens trigonométrique du SVG,
 *   l'avion regardant vers la droite) ;
 * - `speed` va de 0 (arrêt) à 1 (vitesse de croisière) ;
 * - `advance` est la position de l'avion dans le cadre : 0 au roulage, puis
 *   il avance quand il monte (la caméra le suit avec un léger retard).
 */

/** Durée d'un cycle complet roulage → décollage → croisière → atterrissage. */
export const CYCLE_MS = 5200;
/** Atterrissage accéléré joué quand le chargement se termine en plein vol. */
export const LANDING_MS = 700;
/** Atterrissage plus court quand l'avion est déjà au sol (simple freinage). */
export const GROUND_STOP_MS = 320;
/** Fondu de sortie, une fois l'avion immobilisé. */
export const FADE_MS = 180;
/**
 * Délai laissé à un loader suivant pour « reprendre le vol » avant de lancer
 * l'atterrissage (ex. loading.tsx qui cède la place à un Suspense imbriqué).
 */
export const HANDOFF_GRACE_MS = 120;
/**
 * Durée minimale d'affichage, atterrissage compris : même si le contenu est
 * prêt plus tôt, le loader reste 2 s (décollage puis atterrissage complets).
 */
export const MIN_DISPLAY_MS = 2000;
/** Rotation des messages sous l'animation. */
export const MESSAGE_INTERVAL_MS = 1800;
/** Au-delà, un message rassure sur un chargement anormalement long. */
export const SLOW_LOADING_MS = 8000;
/** Vitesse de défilement de la piste à `speed = 1`, en unités SVG par ms. */
export const CRUISE_PX_PER_MS = 0.16;

export const LOADING_MESSAGES = [
    "Préparation du vol…",
    "Visite pré-vol…",
    "Mise en route…",
    "Alignement piste…",
    "Contact radio…",
    "En approche…",
] as const;
export const LANDING_MESSAGE = "Atterrissage…";
export const SLOW_LOADING_MESSAGE = "Ça prend un peu plus de temps que prévu, merci de patienter…";

export interface FlightPose {
    altitude: number;
    pitch: number;
    speed: number;
    advance: number;
}

interface Keyframe {
    t: number;
    v: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Smoothstep : dérivée nulle aux extrémités, donc raccords sans à-coup. */
const smoothstep = (x: number) => {
    const k = clamp01(x);
    return k * k * (3 - 2 * k);
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Interpolation lissée entre clés triées ; la première clé est à 0, la dernière à 1. */
function sample(keys: readonly Keyframe[], t: number): number {
    for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i].t) {
            const a = keys[i - 1];
            const b = keys[i];
            return lerp(a.v, b.v, smoothstep((t - a.t) / (b.t - a.t)));
        }
    }
    return keys[keys.length - 1].v;
}

// Les clés en 0 et en 1 sont identiques : le cycle boucle sans raccord.
// Le décollage est volontairement tôt dans le cycle : sur un affichage
// minimal (MIN_DISPLAY_MS), l'avion a nettement pris de la hauteur avant
// d'atterrir.
const ALTITUDE: readonly Keyframe[] = [
    { t: 0, v: 0 },
    { t: 0.1, v: 0 }, // roulage
    { t: 0.3, v: 1 }, // montée
    { t: 0.6, v: 1 }, // croisière
    { t: 0.845, v: 0 }, // descente + arrondi, toucher des roues
    { t: 1, v: 0 }, // décélération
];

const PITCH: readonly Keyframe[] = [
    { t: 0, v: 0 },
    { t: 0.06, v: 0 },
    { t: 0.11, v: -11 }, // rotation sur le train principal
    { t: 0.23, v: -8 },
    { t: 0.33, v: 0 },
    { t: 0.6, v: 0 },
    { t: 0.67, v: 3 }, // descente, léger piqué
    { t: 0.79, v: 2 },
    { t: 0.845, v: -5 }, // arrondi
    { t: 0.9, v: -4 },
    { t: 0.94, v: 0 }, // la roulette avant se pose
    { t: 1, v: 0 },
];

const SPEED: readonly Keyframe[] = [
    { t: 0, v: 0.3 },
    { t: 0.1, v: 1 },
    { t: 0.845, v: 1 },
    { t: 0.97, v: 0.3 },
    { t: 1, v: 0.3 },
];

const cycleProgress = (elapsedMs: number) => {
    const p = (elapsedMs % CYCLE_MS) / CYCLE_MS;
    return p < 0 ? p + 1 : p;
};

/** Pose de l'avion à un instant du cycle (`progress` dans [0, 1[). */
export function cyclePose(progress: number): FlightPose {
    const t = clamp01(progress);
    const altitude = sample(ALTITUDE, t);
    return {
        altitude,
        pitch: sample(PITCH, t),
        speed: sample(SPEED, t),
        advance: altitude,
    };
}

/** Pose après `elapsedMs` de vol, cycles enchaînés. */
export function flightPose(elapsedMs: number): FlightPose {
    return cyclePose(cycleProgress(Math.max(0, elapsedMs)));
}

// Distance parcourue le long d'un cycle, intégrée une fois pour toutes :
// le défilement de la piste et des nuages ne dépend ainsi que du temps écoulé.
const DISTANCE_SAMPLES = 512;
const CYCLE_DISTANCE_TABLE: number[] = (() => {
    const table = [0];
    const dt = CYCLE_MS / DISTANCE_SAMPLES;
    for (let i = 1; i <= DISTANCE_SAMPLES; i++) {
        const s0 = cyclePose((i - 1) / DISTANCE_SAMPLES).speed;
        const s1 = cyclePose(i / DISTANCE_SAMPLES).speed;
        table.push(table[i - 1] + ((s0 + s1) / 2) * CRUISE_PX_PER_MS * dt);
    }
    return table;
})();
const CYCLE_DISTANCE = CYCLE_DISTANCE_TABLE[DISTANCE_SAMPLES];

/** Distance (unités SVG) parcourue après `elapsedMs` de vol. */
export function flightDistance(elapsedMs: number): number {
    const elapsed = Math.max(0, elapsedMs);
    const cycles = Math.floor(elapsed / CYCLE_MS);
    const x = cycleProgress(elapsed) * DISTANCE_SAMPLES;
    const i = Math.min(DISTANCE_SAMPLES - 1, Math.floor(x));
    const inCycle = lerp(CYCLE_DISTANCE_TABLE[i], CYCLE_DISTANCE_TABLE[i + 1], x - i);
    return cycles * CYCLE_DISTANCE + inCycle;
}

const isAirborne = (pose: FlightPose) => pose.altitude > 0.02;

/** Durée de l'atterrissage accéléré depuis une pose donnée. */
export function landingDuration(from: FlightPose): number {
    return isAirborne(from) ? LANDING_MS : GROUND_STOP_MS;
}

/** Instant du toucher des roues dans l'atterrissage (0 si l'avion roule déjà). */
const touchdownAt = (from: FlightPose) => (isAirborne(from) ? 0.6 : 0);

/**
 * Avance de l'avion dans le cadre pendant l'atterrissage : la caméra cesse de
 * le suivre, il continue donc vers l'avant en ralentissant jusqu'à l'arrêt.
 * Jamais de recul, quelle que soit l'altitude perdue.
 */
const LANDING_ADVANCE = 0.7;

/**
 * Atterrissage accéléré depuis n'importe quelle pose (`k` dans [0, 1]) :
 * approche à vitesse constante, arrondi (vitesse verticale nulle au toucher,
 * léger cabré), puis freinage une fois les roues au sol jusqu'à l'arrêt.
 */
export function landingPose(from: FlightPose, k: number): FlightPose {
    const x = clamp01(k);
    const touch = touchdownAt(from);
    // Plein régime jusqu'au toucher, puis freinage progressif.
    const speed = from.speed * (1 - smoothstep((x - touch) / (1 - touch)));
    const advance = from.advance + LANDING_ADVANCE * (1 - (1 - x) * (1 - x));
    if (!isAirborne(from)) {
        return {
            altitude: from.altitude * (1 - smoothstep(x / 0.4)),
            pitch: from.pitch * (1 - smoothstep(x / 0.4)),
            speed,
            advance,
        };
    }
    const altitude = from.altitude * (1 - smoothstep(x / touch));
    const pitch =
        x < 0.55
            ? lerp(from.pitch, -5, smoothstep(x / 0.55))
            : lerp(-5, 0, smoothstep((x - 0.7) / 0.15));
    return { altitude, pitch, speed, advance };
}

/** Distance parcourue pendant l'atterrissage (intégrale exacte de `speed`). */
export function landingDistance(from: FlightPose, k: number): number {
    const x = clamp01(k);
    const touch = touchdownAt(from);
    const scale = from.speed * CRUISE_PX_PER_MS * landingDuration(from);
    if (x <= touch) return scale * x;
    // ∫ (1 - smoothstep(u)) du = u - u³ + u⁴/2, avec u = (x - touch) / (1 - touch).
    const u = (x - touch) / (1 - touch);
    return scale * (touch + (1 - touch) * (u - u ** 3 + u ** 4 / 2));
}

/** Index du message à afficher après `elapsedMs` de chargement. */
export function messageIndex(elapsedMs: number): number {
    const step = Math.floor(Math.max(0, elapsedMs) / MESSAGE_INTERVAL_MS);
    return step % LOADING_MESSAGES.length;
}

// ---------------------------------------------------------------------------
// Coordination entre loaders
// ---------------------------------------------------------------------------

export interface LoaderRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export type LoaderVariant = "page" | "inline";

/** Ce qu'un loader visible transmet en se démontant, pour que l'atterrissage se joue à sa place. */
export interface LoaderSnapshot {
    rect: LoaderRect;
    background: string;
    variant: LoaderVariant;
    showMessages: boolean;
}

export interface Handoff extends LoaderSnapshot {
    id: number;
    /**
     * Élément parent du loader. S'il quitte le DOM (dialogue fermé, navigation
     * ailleurs), l'atterrissage n'a plus de sens et s'arrête aussitôt.
     */
    anchor: Element | null;
    /** Début du vol (horloge partagée), pour poursuivre le cycle sans saut. */
    startedAt: number;
    /** Instant où l'atterrissage commence, si aucun loader n'a repris le vol d'ici là. */
    landingAt: number;
}

export interface FlightCoordinator {
    /** Un loader apparaît : reprend le vol en cours s'il y en a un, sinon en démarre un. */
    join(): { startedAt: number; continuing: boolean };
    /**
     * Un loader disparaît. `snapshot` vaut null s'il n'était pas affiché
     * (élément de taille nulle) : le vol s'arrête alors sans animation.
     * Sinon l'atterrissage est programmé, jamais avant MIN_DISPLAY_MS.
     */
    leave(snapshot: LoaderSnapshot | null, anchor?: Element | null): void;
    /** Vrai si un vol est en cours (loader affiché ou atterrissage en attente). */
    isFlying(): boolean;
    /** Début du vol en cours (horloge partagée), null hors chargement. */
    getStartedAt(): number | null;
    getHandoff(): Handoff | null;
    /** L'atterrissage est terminé : le vol est clos. */
    finishHandoff(id: number): void;
    subscribe(listener: () => void): () => void;
}

export function createFlightCoordinator(
    now: () => number,
    {
        graceMs = HANDOFF_GRACE_MS,
        minDisplayMs = MIN_DISPLAY_MS,
    }: { graceMs?: number; minDisplayMs?: number } = {},
): FlightCoordinator {
    let active = 0;
    let startedAt: number | null = null;
    let handoff: Handoff | null = null;
    let nextId = 1;
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((l) => l());

    return {
        join() {
            const continuing = startedAt !== null && (active > 0 || handoff !== null);
            if (!continuing) startedAt = now();
            active++;
            // Un loader reprend le vol : l'atterrissage prévu est annulé.
            const cancelled = handoff !== null;
            handoff = null;
            if (!continuing || cancelled) notify();
            return { startedAt: startedAt as number, continuing };
        },
        leave(snapshot, anchor = null) {
            active = Math.max(0, active - 1);
            if (active > 0) return;
            if (snapshot && startedAt !== null) {
                // L'atterrissage (LANDING_MS) se termine au plus tôt à MIN_DISPLAY_MS.
                const earliestLanding = startedAt + minDisplayMs - LANDING_MS;
                handoff = {
                    ...snapshot,
                    anchor,
                    id: nextId++,
                    startedAt,
                    landingAt: Math.max(now() + graceMs, earliestLanding),
                };
            } else {
                startedAt = null;
                handoff = null;
            }
            notify();
        },
        isFlying() {
            return startedAt !== null && (active > 0 || handoff !== null);
        },
        getStartedAt() {
            return startedAt;
        },
        getHandoff() {
            return handoff;
        },
        finishHandoff(id) {
            if (handoff?.id !== id) return;
            handoff = null;
            if (active === 0) startedAt = null;
            notify();
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
