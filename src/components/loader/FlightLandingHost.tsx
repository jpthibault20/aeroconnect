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
 * Prend le relais du dernier loader démonté (AER-70), à son emplacement exact :
 * le contenu est déjà rendu dessous, masqué jusqu'à la fin de l'affichage
 * minimal puis de l'atterrissage accéléré.
 *
 * Monté une seule fois, dans le layout racine.
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
            // Avant l'atterrissage (affichage minimal, délai de relais) : le vol continue normalement.
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

    // Horloge du relais : bascule de phase au bon moment, et abandon immédiat
    // si la zone du loader a quitté l'écran (dialogue fermé, navigation ailleurs).
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
            // Bloque les clics : le contenu dessous est masqué, on ne doit pas
            // pouvoir interagir avec à l'aveugle.
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
