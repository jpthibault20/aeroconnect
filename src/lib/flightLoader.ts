/**
 * "Plane taking off then landing" loading animation (AER-70).
 *
 * Everything that decides the trajectory lives here, as pure functions of time:
 * the component (src/components/loader/) only projects a pose onto the SVG. Two
 * loaders reading the same clock therefore show exactly the same frame, which
 * allows switching from one loader to another (loading.tsx → Suspense →
 * InitialLoading → client loading) without a visible jump.
 *
 * Conventions:
 * - `altitude` goes from 0 (wheels on the runway) to 1 (cruise);
 * - `pitch` is in degrees, negative = nose up (SVG's trigonometric direction,
 *   with the plane facing right);
 * - `speed` goes from 0 (stopped) to 1 (cruise speed);
 * - `advance` is the plane's position in the frame: 0 while taxiing, then it
 *   moves forward as it climbs (the camera follows with a slight lag).
 */

/**
 * Initial taxi before the first takeoff: a load shorter than this never leaves
 * the ground (no takeoff immediately followed by a landing).
 */
export const TAXI_MS = 1000;
/** Duration of a full taxi → takeoff → cruise → landing cycle. */
export const CYCLE_MS = 5200;
/** Accelerated landing played when loading ends mid-flight. */
export const LANDING_MS = 700;
/** Shorter landing when the plane is already on the ground (just braking). */
export const GROUND_STOP_MS = 320;
/** Fade-out once the plane has stopped. */
export const FADE_MS = 180;
/**
 * Delay left for a following loader to "resume the flight" before starting the
 * landing (e.g. loading.tsx giving way to a nested Suspense).
 */
export const HANDOFF_GRACE_MS = 120;
/**
 * Minimum display time, braking included: even if the content is ready earlier,
 * the plane taxis for the whole initial taxi, then stops.
 */
export const MIN_DISPLAY_MS = TAXI_MS;
/** Rotation of the messages under the animation. */
export const MESSAGE_INTERVAL_MS = 1800;
/** Beyond this, a message reassures about an unusually long load. */
export const SLOW_LOADING_MS = 8000;
/** Runway scroll speed at `speed = 1`, in SVG units per ms. */
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

/** Smoothstep: zero derivative at both ends, so seamless joins. */
const smoothstep = (x: number) => {
    const k = clamp01(x);
    return k * k * (3 - 2 * k);
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Smoothed interpolation between sorted keys; the first key is at 0, the last at 1. */
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

// The keys at 0 and 1 are identical: the cycle loops seamlessly. The cycle
// starts after the initial taxi (TAXI_MS), whose pose is the one at t = 0.
const ALTITUDE: readonly Keyframe[] = [
    { t: 0, v: 0 },
    { t: 0.1, v: 0 }, // taxi
    { t: 0.3, v: 1 }, // climb
    { t: 0.6, v: 1 }, // cruise
    { t: 0.845, v: 0 }, // descent + flare, touchdown
    { t: 1, v: 0 }, // deceleration
];

const PITCH: readonly Keyframe[] = [
    { t: 0, v: 0 },
    { t: 0.06, v: 0 },
    { t: 0.11, v: -11 }, // rotation on the main gear
    { t: 0.23, v: -8 },
    { t: 0.33, v: 0 },
    { t: 0.6, v: 0 },
    { t: 0.67, v: 3 }, // descent, slight nose down
    { t: 0.79, v: 2 },
    { t: 0.845, v: -5 }, // flare
    { t: 0.9, v: -4 },
    { t: 0.94, v: 0 }, // nose wheel touches down
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

/** Plane pose at a point of the cycle (`progress` in [0, 1[). */
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

/** Pose while taxiing: identical to the start of the cycle, so takeoff joins seamlessly. */
const TAXI_POSE = cyclePose(0);

/** Pose after `elapsedMs` of loading: initial taxi, then cycles chained. */
export function flightPose(elapsedMs: number): FlightPose {
    if (elapsedMs < TAXI_MS) return TAXI_POSE;
    return cyclePose(cycleProgress(elapsedMs - TAXI_MS));
}

// Distance traveled along a cycle, integrated once and for all: the runway and
// cloud scrolling thus only depends on elapsed time.
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

const TAXI_PX_PER_MS = TAXI_POSE.speed * CRUISE_PX_PER_MS;

/** Distance (SVG units) traveled after `elapsedMs` of loading. */
export function flightDistance(elapsedMs: number): number {
    const taxiing = Math.min(TAXI_MS, Math.max(0, elapsedMs));
    return taxiing * TAXI_PX_PER_MS + cycleDistance(elapsedMs - TAXI_MS);
}

function cycleDistance(elapsedMs: number): number {
    const elapsed = Math.max(0, elapsedMs);
    const cycles = Math.floor(elapsed / CYCLE_MS);
    const x = cycleProgress(elapsed) * DISTANCE_SAMPLES;
    const i = Math.min(DISTANCE_SAMPLES - 1, Math.floor(x));
    const inCycle = lerp(CYCLE_DISTANCE_TABLE[i], CYCLE_DISTANCE_TABLE[i + 1], x - i);
    return cycles * CYCLE_DISTANCE + inCycle;
}

const isAirborne = (pose: FlightPose) => pose.altitude > 0.02;

/** Duration of the accelerated landing from a given pose. */
export function landingDuration(from: FlightPose): number {
    return isAirborne(from) ? LANDING_MS : GROUND_STOP_MS;
}

/** Touchdown point within the landing (0 if the plane is already taxiing). */
const touchdownAt = (from: FlightPose) => (isAirborne(from) ? 0.6 : 0);

/**
 * Plane advance in the frame during landing: the camera stops following it, so
 * it keeps moving forward while slowing down to a stop. Never backwards, however
 * much altitude is lost.
 */
const LANDING_ADVANCE = 0.7;

/**
 * Accelerated landing from any pose (`k` in [0, 1]): constant-speed approach,
 * flare (zero vertical speed at touchdown, slight nose up), then braking once the
 * wheels are on the ground until it stops.
 */
export function landingPose(from: FlightPose, k: number): FlightPose {
    const x = clamp01(k);
    const touch = touchdownAt(from);
    // Full power until touchdown, then progressive braking.
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

/** Distance traveled during landing (exact integral of `speed`). */
export function landingDistance(from: FlightPose, k: number): number {
    const x = clamp01(k);
    const touch = touchdownAt(from);
    const scale = from.speed * CRUISE_PX_PER_MS * landingDuration(from);
    if (x <= touch) return scale * x;
    // ∫ (1 - smoothstep(u)) du = u - u³ + u⁴/2, with u = (x - touch) / (1 - touch).
    const u = (x - touch) / (1 - touch);
    return scale * (touch + (1 - touch) * (u - u ** 3 + u ** 4 / 2));
}

/** Index of the message to show after `elapsedMs` of loading. */
export function messageIndex(elapsedMs: number): number {
    const step = Math.floor(Math.max(0, elapsedMs) / MESSAGE_INTERVAL_MS);
    return step % LOADING_MESSAGES.length;
}

// ---------------------------------------------------------------------------
// Coordination between loaders
// ---------------------------------------------------------------------------

export interface LoaderRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export type LoaderVariant = "page" | "inline";

/** What a visible loader hands over when unmounting, so the landing plays in its place. */
export interface LoaderSnapshot {
    rect: LoaderRect;
    background: string;
    variant: LoaderVariant;
    showMessages: boolean;
}

export interface Handoff extends LoaderSnapshot {
    id: number;
    /**
     * Parent element of the loader. If it leaves the DOM (dialog closed, navigated
     * elsewhere), the landing no longer makes sense and stops immediately.
     */
    anchor: Element | null;
    /** Flight start (shared clock), to continue the cycle without a jump. */
    startedAt: number;
    /** Instant the landing starts, unless a loader resumes the flight before then. */
    landingAt: number;
}

export interface FlightCoordinator {
    /** A loader appears: resumes the ongoing flight if any, otherwise starts one. */
    join(): { startedAt: number; continuing: boolean };
    /**
     * A loader disappears. `snapshot` is null if it was not displayed (zero-size
     * element): the flight then stops without animation. Otherwise the landing is
     * scheduled, never ending before MIN_DISPLAY_MS.
     */
    leave(snapshot: LoaderSnapshot | null, anchor?: Element | null): void;
    /** True if a flight is in progress (loader shown or landing pending). */
    isFlying(): boolean;
    /** Start of the ongoing flight (shared clock), null outside loading. */
    getStartedAt(): number | null;
    getHandoff(): Handoff | null;
    /** The landing is over: the flight is closed. */
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
            // A loader resumes the flight: the scheduled landing is cancelled.
            const cancelled = handoff !== null;
            handoff = null;
            if (!continuing || cancelled) notify();
            return { startedAt: startedAt as number, continuing };
        },
        leave(snapshot, anchor = null) {
            active = Math.max(0, active - 1);
            if (active > 0) return;
            if (snapshot && startedAt !== null) {
                // Still taxiing at that point (MIN_DISPLAY_MS <= TAXI_MS): the stop
                // is a ground braking, ending at MIN_DISPLAY_MS at the earliest.
                const earliestLanding = startedAt + minDisplayMs - GROUND_STOP_MS;
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
