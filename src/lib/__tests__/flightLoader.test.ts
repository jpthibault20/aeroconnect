import { describe, it, expect } from "vitest";
import {
    CYCLE_MS,
    GROUND_STOP_MS,
    LANDING_MS,
    LOADING_MESSAGES,
    MESSAGE_INTERVAL_MS,
    MIN_DISPLAY_MS,
    createFlightCoordinator,
    cyclePose,
    flightDistance,
    flightPose,
    landingDistance,
    landingDuration,
    landingPose,
    messageIndex,
    type FlightPose,
    type LoaderSnapshot,
} from "@/lib/flightLoader";

const STEP = 1 / 2000;

/** Max gap between two consecutive samples: detects frame jumps. */
function maxJump(f: (k: number) => FlightPose, from = 0, to = 1) {
    let prev = f(from);
    const jump = { altitude: 0, pitch: 0, speed: 0 };
    for (let k = from + STEP; k <= to; k += STEP) {
        const cur = f(k);
        jump.altitude = Math.max(jump.altitude, Math.abs(cur.altitude - prev.altitude));
        jump.pitch = Math.max(jump.pitch, Math.abs(cur.pitch - prev.pitch));
        jump.speed = Math.max(jump.speed, Math.abs(cur.speed - prev.speed));
        prev = cur;
    }
    return jump;
}

const snapshot: LoaderSnapshot = {
    rect: { top: 0, left: 0, width: 400, height: 300 },
    background: "rgb(255, 255, 255)",
    variant: "page",
    showMessages: true,
};

describe("cyclePose", () => {
    it("démarre au sol, à l'arrêt partiel, sans assiette", () => {
        expect(cyclePose(0)).toEqual({ altitude: 0, pitch: 0, speed: 0.3, advance: 0 });
    });

    it("boucle sans raccord visible", () => {
        const start = cyclePose(0);
        const end = cyclePose(1 - STEP);
        expect(end.altitude).toBeCloseTo(start.altitude, 3);
        expect(end.pitch).toBeCloseTo(start.pitch, 2);
        expect(end.speed).toBeCloseTo(start.speed, 3);
    });

    it("est continue (aucun saut d'une image à l'autre)", () => {
        const jump = maxJump(cyclePose);
        expect(jump.altitude).toBeLessThan(0.01);
        expect(jump.pitch).toBeLessThan(0.5);
        expect(jump.speed).toBeLessThan(0.01);
    });

    it("décolle nez haut et vole en palier en croisière", () => {
        expect(cyclePose(0.08).altitude).toBe(0);
        expect(cyclePose(0.11).pitch).toBeLessThan(-10);
        expect(cyclePose(0.53)).toMatchObject({ altitude: 1, pitch: 0, speed: 1 });
    });

    it("se pose avec un arrondi (nez haut au toucher) puis repose la roulette avant", () => {
        expect(cyclePose(0.845).altitude).toBe(0);
        expect(cyclePose(0.845).pitch).toBeLessThan(0);
        expect(cyclePose(0.96).pitch).toBe(0);
    });

    it("garde les roues au-dessus de la piste", () => {
        for (let k = 0; k <= 1; k += STEP) {
            expect(cyclePose(k).altitude).toBeGreaterThanOrEqual(0);
        }
    });
});

describe("flightPose / flightDistance", () => {
    it("enchaîne les cycles", () => {
        expect(flightPose(CYCLE_MS * 3 + 1234)).toEqual(flightPose(1234));
    });

    it("avance toujours, y compris au passage d'un cycle à l'autre", () => {
        let prev = flightDistance(0);
        for (let t = 16; t < CYCLE_MS * 2.5; t += 16) {
            const d = flightDistance(t);
            expect(d).toBeGreaterThan(prev);
            expect(d - prev).toBeLessThan(5);
            prev = d;
        }
    });
});

describe("landingPose", () => {
    const poses = [0, 0.1, 0.3, 0.5, 0.7, 0.8, 0.9].map(cyclePose);

    it("part exactement de la pose courante", () => {
        for (const from of poses) {
            const p = landingPose(from, 0);
            expect(p.altitude).toBeCloseTo(from.altitude, 6);
            expect(p.pitch).toBeCloseTo(from.pitch, 6);
            expect(p.speed).toBeCloseTo(from.speed, 6);
        }
    });

    it("finit toujours au sol, à plat et immobilisé", () => {
        for (const from of poses) {
            const end = landingPose(from, 1);
            expect(end.altitude).toBeCloseTo(0, 6);
            expect(end.pitch).toBeCloseTo(0, 6);
            expect(end.speed).toBeCloseTo(0, 6);
        }
    });

    it("est continu, quel que soit le moment où le chargement se termine", () => {
        for (const from of poses) {
            const jump = maxJump((k) => landingPose(from, k));
            expect(jump.altitude).toBeLessThan(0.01);
            expect(jump.pitch).toBeLessThan(0.5);
        }
    });

    it("avance toujours dans le cadre, sans jamais reculer (même en perdant de l'altitude)", () => {
        for (const from of poses) {
            let prev = landingPose(from, 0).advance;
            for (let k = STEP; k <= 1; k += STEP) {
                const cur = landingPose(from, k).advance;
                expect(cur).toBeGreaterThanOrEqual(prev);
                prev = cur;
            }
            expect(prev).toBeGreaterThan(from.advance);
        }
    });

    it("garde sa vitesse jusqu'au toucher des roues, puis freine", () => {
        const from = cyclePose(0.5);
        expect(landingPose(from, 0.3).speed).toBeCloseTo(from.speed, 6);
        expect(landingPose(from, 0.6).altitude).toBeCloseTo(0, 6);
        expect(landingPose(from, 0.8).speed).toBeLessThan(from.speed);
    });

    it("fait défiler la piste en accord avec la vitesse (intégrale exacte)", () => {
        for (const from of [cyclePose(0.05), cyclePose(0.5)]) {
            const duration = landingDuration(from);
            let numeric = 0;
            const n = 4000;
            for (let i = 0; i < n; i++) {
                const k = (i + 0.5) / n;
                numeric += landingPose(from, k).speed * 0.16 * (duration / n);
            }
            expect(landingDistance(from, 1)).toBeCloseTo(numeric, 3);
        }
    });

    it("est plus court quand l'avion roule déjà", () => {
        expect(landingDuration(cyclePose(0.5))).toBe(LANDING_MS);
        expect(landingDuration(cyclePose(0.05))).toBe(GROUND_STOP_MS);
    });

    it("ne recule jamais pendant le freinage", () => {
        const from = cyclePose(0.5);
        let prev = 0;
        for (let k = STEP; k <= 1; k += STEP) {
            const d = landingDistance(from, k);
            expect(d).toBeGreaterThanOrEqual(prev);
            prev = d;
        }
    });
});

describe("affichage minimal", () => {
    it("laisse l'avion nettement décoller avant l'atterrissage imposé", () => {
        const pose = flightPose(MIN_DISPLAY_MS - LANDING_MS);
        expect(pose.altitude).toBeGreaterThan(0.7);
        expect(landingDuration(pose)).toBe(LANDING_MS);
    });
});

describe("messageIndex", () => {
    it("change de message à intervalle régulier et boucle", () => {
        expect(messageIndex(0)).toBe(0);
        expect(messageIndex(MESSAGE_INTERVAL_MS - 1)).toBe(0);
        expect(messageIndex(MESSAGE_INTERVAL_MS)).toBe(1);
        expect(messageIndex(MESSAGE_INTERVAL_MS * LOADING_MESSAGES.length)).toBe(0);
    });
});

describe("createFlightCoordinator", () => {
    function setup() {
        let t = 1000;
        const coordinator = createFlightCoordinator(() => t, { graceMs: 120, minDisplayMs: 2000 });
        return { coordinator, advance: (ms: number) => (t += ms) };
    }

    it("démarre un nouveau vol quand rien n'est en cours", () => {
        const { coordinator } = setup();
        expect(coordinator.join()).toEqual({ startedAt: 1000, continuing: false });
        expect(coordinator.isFlying()).toBe(true);
    });

    it("programme un atterrissage quand le dernier loader disparaît", () => {
        const { coordinator, advance } = setup();
        const anchor = {} as Element;
        coordinator.join();
        advance(3000);
        coordinator.leave(snapshot, anchor);
        expect(coordinator.getHandoff()).toMatchObject({ startedAt: 1000, landingAt: 4120, anchor });
        expect(coordinator.isFlying()).toBe(true);
    });

    it("impose l'affichage minimal même si le contenu arrive tout de suite", () => {
        const { coordinator, advance } = setup();
        coordinator.join();
        advance(100);
        coordinator.leave(snapshot);
        const { landingAt } = coordinator.getHandoff()!;
        // Landing ends exactly 2 s after the flight started.
        expect(landingAt + LANDING_MS).toBe(1000 + 2000);
    });

    it("n'atterrit pas si le loader n'était pas affiché (taille nulle)", () => {
        const { coordinator } = setup();
        coordinator.join();
        coordinator.leave(null);
        expect(coordinator.getHandoff()).toBeNull();
        expect(coordinator.isFlying()).toBe(false);
    });

    it("poursuit le même vol quand un loader prend le relais (pas d'atterrissage intermédiaire)", () => {
        const { coordinator, advance } = setup();
        coordinator.join();
        advance(1500);
        coordinator.leave(snapshot);
        advance(10);
        expect(coordinator.join()).toEqual({ startedAt: 1000, continuing: true });
        expect(coordinator.getHandoff()).toBeNull();
    });

    it("n'atterrit pas tant qu'un autre loader est encore affiché", () => {
        const { coordinator } = setup();
        coordinator.join();
        coordinator.join();
        coordinator.leave(snapshot);
        expect(coordinator.getHandoff()).toBeNull();
        coordinator.leave(snapshot);
        expect(coordinator.getHandoff()).not.toBeNull();
    });

    it("clôt le vol une fois l'atterrissage terminé", () => {
        const { coordinator, advance } = setup();
        coordinator.join();
        coordinator.leave(snapshot);
        const id = coordinator.getHandoff()!.id;
        coordinator.finishHandoff(id);
        expect(coordinator.isFlying()).toBe(false);
        advance(5000);
        expect(coordinator.join()).toEqual({ startedAt: 6000, continuing: false });
    });

    it("ignore la fin d'un atterrissage déjà remplacé", () => {
        const { coordinator } = setup();
        coordinator.join();
        coordinator.leave(snapshot);
        const first = coordinator.getHandoff()!.id;
        coordinator.join();
        coordinator.leave(snapshot);
        coordinator.finishHandoff(first);
        expect(coordinator.getHandoff()).not.toBeNull();
    });

    it("prévient les abonnés quand le vol démarre, atterrit ou reprend", () => {
        const { coordinator } = setup();
        let calls = 0;
        const unsubscribe = coordinator.subscribe(() => calls++);
        coordinator.join(); // new flight
        coordinator.join(); // second loader, same flight: nothing changes
        coordinator.leave(null);
        coordinator.leave(snapshot); // landing scheduled
        coordinator.join(); // resumed
        unsubscribe();
        coordinator.leave(snapshot);
        expect(calls).toBe(3);
    });

    it("expose l'heure de départ du vol en cours", () => {
        const { coordinator } = setup();
        expect(coordinator.getStartedAt()).toBeNull();
        coordinator.join();
        expect(coordinator.getStartedAt()).toBe(1000);
        coordinator.leave(null);
        expect(coordinator.getStartedAt()).toBeNull();
    });
});
