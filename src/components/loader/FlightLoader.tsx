"use client";

import React, { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LOADING_MESSAGES, flightDistance, flightPose, type LoaderVariant } from "@/lib/flightLoader";
import { reducedMotionFrame, type SceneFrame } from "./FlightScene";
import FlightLoaderView from "./FlightLoaderView";
import { flightCoordinator, resolveBackground, useFlightMessage } from "./flightStore";

interface Props {
    /** "page": full screen loading; "inline": content area inside a page. */
    variant?: LoaderVariant;
    className?: string;
    showMessages?: boolean;
}

/**
 * AeroConnect loading animation (AER-70): an ultralight takes off, flies and
 * lands in a loop while the content loads.
 *
 * - Shown for at least MIN_DISPLAY_MS, landing included: if the content arrives
 *   earlier, FlightLandingHost extends the flight on top.
 * - Successive loaders (loading.tsx → Suspense → InitialLoading → client data)
 *   share the same flight: no restart in between.
 * - When loading ends, the plane lands fast then fades out.
 */
export default function FlightLoader({ variant = "page", className, showMessages = true }: Props) {
    const rootRef = useRef<HTMLDivElement>(null);
    const startedAt = useSyncExternalStore(
        flightCoordinator.subscribe,
        flightCoordinator.getStartedAt,
        () => null,
    );
    // Flight already in progress (handoff from a previous loader): shown immediately,
    // no fade.
    const [instant] = useState(() => typeof window !== "undefined" && flightCoordinator.isFlying());
    const reducedMotion = useReducedMotion() ?? false;

    useLayoutEffect(() => {
        flightCoordinator.join();
        const el = rootRef.current;
        return () => {
            // Measured here: the loader's DOM is still in place during this cleanup.
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
