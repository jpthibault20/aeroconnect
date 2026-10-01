"use client";

import React, { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { motion, useAnimationFrame, useReducedMotion } from "framer-motion";
import {
    FADE_MS,
    LANDING_MESSAGE,
    LOADING_MESSAGES,
    flightDistance,
    flightPose,
    landingDistance,
    landingDuration,
    landingPose,
    type Handoff,
} from "@/lib/flightLoader";
import { reducedMotionFrame, type SceneFrame } from "./FlightScene";
import FlightLoaderView from "./FlightLoaderView";
import { flightCoordinator, useFlightMessage } from "./flightStore";

/**
 * Takes over from the last unmounted loader (AER-70), at its exact position: the
 * content is already rendered underneath, hidden until the minimum display time
 * and the accelerated landing are over.
 *
 * Mounted once, in the root layout.
 */
export default function FlightLandingHost() {
    const handoff = useSyncExternalStore(
        flightCoordinator.subscribe,
        flightCoordinator.getHandoff,
        () => null,
    );
    if (!handoff) return null;
    return <LandingOverlay key={handoff.id} handoff={handoff} />;
}

function LandingOverlay({ handoff }: { handoff: Handoff }) {
    const reducedMotion = useReducedMotion() ?? false;
    const [phase, setPhase] = useState<"flying" | "landing" | "fading">("flying");
    const phaseRef = useRef(phase);

    const touchdownStart = handoff.landingAt - handoff.startedAt;
    const landedAt = handoff.landingAt + (reducedMotion ? 0 : landingDuration(flightPose(touchdownStart)));

    const frame = useCallback(
        (now: number): SceneFrame => {
            const elapsed = now - handoff.startedAt;
            // Before landing (minimum display, handoff delay): the flight goes on normally.
            if (now < handoff.landingAt) {
                return { pose: flightPose(elapsed), distance: flightDistance(elapsed) };
            }
            const start = flightPose(touchdownStart);
            const k = (now - handoff.landingAt) / landingDuration(start);
            return {
                pose: landingPose(start, k),
                distance: flightDistance(touchdownStart) + landingDistance(start, k),
            };
        },
        [handoff.startedAt, handoff.landingAt, touchdownStart],
    );

    // Handoff clock: switches phase at the right time, and bails out immediately if
    // the loader area left the screen (dialog closed, navigated elsewhere).
    useAnimationFrame(
        useCallback(() => {
            if (handoff.anchor && !handoff.anchor.isConnected) {
                flightCoordinator.finishHandoff(handoff.id);
                return;
            }
            const now = performance.now();
            const next = now >= landedAt ? "fading" : now >= handoff.landingAt ? "landing" : "flying";
            if (next !== phaseRef.current) {
                phaseRef.current = next;
                setPhase(next);
            }
        }, [handoff.anchor, handoff.id, handoff.landingAt, landedAt]),
    );

    const { index } = useFlightMessage(handoff.startedAt);
    const message = phase === "flying" ? LOADING_MESSAGES[index] : LANDING_MESSAGE;

    const { rect } = handoff;
    return (
        <motion.div
            aria-hidden="true"
            // Block clicks: the content underneath is hidden, it must not be interacted with
            // blindly.
            className="fixed z-[60] flex cursor-progress items-center justify-center"
            style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                background: handoff.background,
            }}
            initial={false}
            animate={{ opacity: phase === "fading" ? 0 : 1 }}
            transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
            onAnimationComplete={() => {
                if (phaseRef.current === "fading") flightCoordinator.finishHandoff(handoff.id);
            }}
        >
            <FlightLoaderView
                variant={handoff.variant}
                frame={reducedMotion ? reducedMotionFrame : frame}
                animate={!reducedMotion}
                showMessages={handoff.showMessages}
                message={message}
                slow={false}
            />
        </motion.div>
    );
}
