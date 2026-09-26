"use client";

import React, { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LOADING_MESSAGES, flightDistance, flightPose, type LoaderVariant } from "@/lib/flightLoader";
import { reducedMotionFrame, type SceneFrame } from "./FlightScene";
import FlightLoaderView from "./FlightLoaderView";
import { flightCoordinator, resolveBackground, useFlightMessage } from "./flightStore";

interface Props {
    /** "page" : chargement d'écran complet ; "inline" : zone de contenu dans une page. */
    variant?: LoaderVariant;
    className?: string;
    showMessages?: boolean;
}

/**
 * Animation de chargement AeroConnect (AER-70) : un ULM décolle, vole puis
 * atterrit en boucle tant que le contenu charge.
 *
 * - Affiché au minimum MIN_DISPLAY_MS, atterrissage compris : si le contenu
 *   arrive plus tôt, FlightLandingHost prolonge le vol par-dessus.
 * - Plusieurs loaders successifs (loading.tsx → Suspense → InitialLoading →
 *   données client) partagent le même vol : pas de redémarrage entre deux.
 * - À la fin du chargement, l'avion atterrit en accéléré puis s'efface.
 */
export default function FlightLoader({ variant = "page", className, showMessages = true }: Props) {
    const rootRef = useRef<HTMLDivElement>(null);
    const startedAt = useSyncExternalStore(
        flightCoordinator.subscribe,
        flightCoordinator.getStartedAt,
        () => null,
    );
    // Vol déjà en cours (relais d'un loader précédent) : affichage immédiat, sans fondu.
    const [instant] = useState(() => typeof window !== "undefined" && flightCoordinator.isFlying());
    const reducedMotion = useReducedMotion() ?? false;

    useLayoutEffect(() => {
        flightCoordinator.join();
        const el = rootRef.current;
        return () => {
            // Mesuré ici : le DOM du loader est encore en place pendant ce nettoyage.
            const rect = el?.getBoundingClientRect();
            const displayed = el && rect && rect.width > 0 && rect.height > 0;
            flightCoordinator.leave(
                displayed
                    ? {
                          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                          background: resolveBackground(el),
                          variant,
                          showMessages,
                      }
                    : null,
                el?.parentElement ?? null,
            );
        };
    }, [variant, showMessages]);

    const frame = useCallback(
        (now: number): SceneFrame => {
            const elapsed = now - (startedAt ?? now);
            return { pose: flightPose(elapsed), distance: flightDistance(elapsed) };
        },
        [startedAt],
    );

    const { index, slow } = useFlightMessage(startedAt);

    return (
        <motion.div
            ref={rootRef}
            role="status"
            aria-live="polite"
            className={cn(
                "flex w-full items-center justify-center",
                variant === "page" ? "h-full min-h-[50vh]" : "py-6",
                className,
            )}
            initial={instant ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <span className="sr-only">Chargement en cours…</span>
            {startedAt !== null && (
                <FlightLoaderView
                    variant={variant}
                    frame={reducedMotion ? reducedMotionFrame : frame}
                    animate={!reducedMotion}
                    showMessages={showMessages}
                    message={LOADING_MESSAGES[index]}
                    slow={slow}
                />
            )}
        </motion.div>
    );
}
