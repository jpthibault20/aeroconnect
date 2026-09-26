"use client";

import { useEffect, useState } from "react";
import { SLOW_LOADING_MS, createFlightCoordinator, messageIndex } from "@/lib/flightLoader";

/**
 * Vol partagé par tous les loaders de la page (AER-70). Horloge :
 * performance.now(), la même que celle lue à chaque image par FlightScene.
 */
export const flightCoordinator = createFlightCoordinator(() => performance.now());

/** Fond effectivement visible derrière un élément, pour que l'atterrissage le recouvre à l'identique. */
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
 * Message courant et bascule « chargement long », recalculés sur l'horloge
 * partagée : un loader qui prend le relais affiche d'emblée le bon message.
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
