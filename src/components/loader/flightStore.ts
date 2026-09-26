"use client";

import { useEffect, useState } from "react";
import { SLOW_LOADING_MS, createFlightCoordinator, messageIndex } from "@/lib/flightLoader";

/**
 * Flight shared by every loader on the page (AER-70). Clock: performance.now(),
 * the same one FlightScene reads on each frame.
 */
export const flightCoordinator = createFlightCoordinator(() => performance.now());

/** Background actually visible behind an element, so the landing covers it identically. */
export function resolveBackground(el: HTMLElement): string {
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const color = getComputedStyle(node).backgroundColor;
        if (color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") return color;
    }
    return "#ffffff";
}

function messageState(startedAt: number | null) {
    if (startedAt === null) return { index: 0, slow: false };
    const elapsed = performance.now() - startedAt;
    return { index: messageIndex(elapsed), slow: elapsed >= SLOW_LOADING_MS };
}

/**
 * Current message and "long loading" switch, recomputed on the shared clock: a
 * loader taking over shows the right message right away.
 */
export function useFlightMessage(startedAt: number | null) {
    const [state, setState] = useState(() => messageState(startedAt));
    useEffect(() => {
        if (startedAt === null) return;
        const update = () => {
            const next = messageState(startedAt);
            setState((prev) => (prev.index === next.index && prev.slow === next.slow ? prev : next));
        };
        update();
        const timer = setInterval(update, 250);
        return () => clearInterval(timer);
    }, [startedAt]);
    return state;
}
