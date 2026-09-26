"use client";

import React, { useCallback, useId, useLayoutEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";
import { cyclePose, type FlightPose } from "@/lib/flightLoader";

/**
 * Scène SVG de l'animation de chargement (AER-70) : un ULM de profil sur une
 * piste, caméra qui le suit. La trajectoire vient de src/lib/flightLoader.ts ;
 * ce composant ne fait que projeter une pose à chaque image.
 *
 * Les attributs sont écrits directement sur les nœuds SVG à chaque image de la
 * boucle Motion (useAnimationFrame) : aucun re-render React pendant le vol.
 */

export interface SceneFrame {
    pose: FlightPose;
    /** Distance parcourue (unités SVG), fait défiler la piste et les nuages. */
    distance: number;
}

export type FrameSource = (now: number) => SceneFrame;

/** Image fixe (avion en croisière) quand l'utilisateur a demandé moins d'animations. */
const REDUCED_MOTION_FRAME: SceneFrame = { pose: cyclePose(0.53), distance: 0 };
export const reducedMotionFrame: FrameSource = () => REDUCED_MOTION_FRAME;

const WIDTH = 320;
const HEIGHT = 140;
const GROUND_Y = 112;
/** Hauteur de vol en croisière, en unités SVG. */
const ALT_PX = 56;
/** Position de l'avion dans le cadre : PLANE_X0 au roulage, + PLANE_DX par unité d'`advance`. */
const PLANE_X0 = 118;
const PLANE_DX = 30;
/** Pivot de rotation : le train principal, comme un vrai décollage. */
const PIVOT_X = 8;

const BRAND = "#774BBE";
const BRAND_DARK = "#5B3596";
const BRAND_SOFT = "#A68AD8";

/** Nuages : `factor` règle la parallaxe (les lointains défilent moins vite). */
const CLOUDS = [
    { x: 30, y: 24, scale: 0.7, factor: 0.16, opacity: 0.55 },
    { x: 170, y: 12, scale: 0.55, factor: 0.16, opacity: 0.5 },
    { x: 280, y: 36, scale: 0.65, factor: 0.16, opacity: 0.55 },
    { x: 100, y: 52, scale: 1, factor: 0.38, opacity: 0.9 },
    { x: 250, y: 68, scale: 0.85, factor: 0.38, opacity: 0.85 },
] as const;
const CLOUD_WRAP = WIDTH + 80;

const wrapX = (x: number) => (((x + 60) % CLOUD_WRAP) + CLOUD_WRAP) % CLOUD_WRAP - 60;

interface Nodes {
    plane: SVGGElement | null;
    shadow: SVGEllipseElement | null;
    centerline: SVGLineElement | null;
    lights: SVGLineElement | null;
    propeller: SVGEllipseElement | null;
    clouds: (SVGGElement | null)[];
}

function applyFrame(nodes: Nodes, { pose, distance }: SceneFrame, now: number, spin: boolean) {
    const { altitude, pitch, advance } = pose;
    const x = PLANE_X0 + PLANE_DX * advance;
    const y = GROUND_Y - ALT_PX * altitude;
    nodes.plane?.setAttribute(
        "transform",
        `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${pitch.toFixed(2)} ${PIVOT_X} 0)`,
    );
    if (nodes.shadow) {
        nodes.shadow.setAttribute(
            "transform",
            `translate(${(x - 2).toFixed(2)} ${GROUND_Y + 1.5}) scale(${(1 - 0.55 * altitude).toFixed(3)} 1)`,
        );
        nodes.shadow.setAttribute("opacity", (0.2 * (1 - 0.8 * altitude)).toFixed(3));
    }
    const offset = distance.toFixed(2);
    nodes.centerline?.setAttribute("stroke-dashoffset", offset);
    nodes.lights?.setAttribute("stroke-dashoffset", offset);
    CLOUDS.forEach((cloud, i) => {
        nodes.clouds[i]?.setAttribute(
            "transform",
            `translate(${wrapX(cloud.x - distance * cloud.factor).toFixed(2)} ${cloud.y}) scale(${cloud.scale})`,
        );
    });
    // Hélice : disque flou qui « bat » pour suggérer la rotation.
    const blade = spin ? 0.3 + 0.7 * Math.abs(Math.sin(now / 26)) : 1;
    nodes.propeller?.setAttribute("transform", `translate(29.6 -10.5) scale(1 ${blade.toFixed(3)})`);
}

interface Props {
    frame: FrameSource;
    /** false : image fixe (mouvement réduit, ou inspection image par image). */
    animate: boolean;
    className?: string;
}

export default function FlightScene({ frame, animate, className }: Props) {
    const maskId = `flight-fade-${useId().replace(/:/g, "")}`;
    const nodes = useRef<Nodes>({
        plane: null,
        shadow: null,
        centerline: null,
        lights: null,
        propeller: null,
        clouds: [],
    });

    // Première pose posée avant l'affichage : jamais d'image avec l'avion à l'origine.
    useLayoutEffect(() => {
        const now = performance.now();
        applyFrame(nodes.current, frame(now), now, animate);
    }, [frame, animate]);

    // Horloge absolue (performance.now) plutôt que le temps relatif fourni par
    // Motion : c'est elle que partagent tous les loaders et l'atterrissage.
    useAnimationFrame(
        useCallback(() => {
            if (!animate) return;
            const now = performance.now();
            applyFrame(nodes.current, frame(now), now, true);
        }, [frame, animate]),
    );

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <linearGradient id={`${maskId}-g`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#000" />
                    <stop offset="0.14" stopColor="#fff" />
                    <stop offset="0.86" stopColor="#fff" />
                    <stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height={HEIGHT}>
                    <rect width={WIDTH} height={HEIGHT} fill={`url(#${maskId}-g)`} />
                </mask>
            </defs>

            {/* Décor (fondu sur les bords) */}
            <g mask={`url(#${maskId})`}>
                {CLOUDS.map((cloud, i) => (
                    <g
                        key={i}
                        ref={(el) => {
                            nodes.current.clouds[i] = el;
                        }}
                        opacity={cloud.opacity}
                        fill="#E4E1EC"
                    >
                        <rect x="0" y="10" width="44" height="8" rx="4" />
                        <circle cx="12" cy="11" r="7" />
                        <circle cx="24" cy="8" r="9" />
                        <circle cx="35" cy="12" r="6" />
                    </g>
                ))}

                <rect x="0" y={GROUND_Y} width={WIDTH} height="12" fill="#E2DEEB" />
                <line x1="0" x2={WIDTH} y1={GROUND_Y} y2={GROUND_Y} stroke="#CFC8DD" strokeWidth="1" />
                <line
                    ref={(el) => {
                        nodes.current.centerline = el;
                    }}
                    x1="0"
                    x2={WIDTH}
                    y1={GROUND_Y + 6.5}
                    y2={GROUND_Y + 6.5}
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                    strokeDasharray="12 10"
                />
                <line
                    ref={(el) => {
                        nodes.current.lights = el;
                    }}
                    x1="0"
                    x2={WIDTH}
                    y1={GROUND_Y + 12}
                    y2={GROUND_Y + 12}
                    stroke={BRAND_SOFT}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeDasharray="0 24"
                />
            </g>

            {/* Ombre portée : se resserre et s'estompe quand l'avion prend de la hauteur */}
            <ellipse
                ref={(el) => {
                    nodes.current.shadow = el;
                }}
                cx="0"
                cy="0"
                rx="26"
                ry="2.2"
                fill="#1F1535"
                opacity="0.2"
            />

            {/* ULM de profil, repère local : roues à y = 0, nez vers la droite */}
            <g
                ref={(el) => {
                    nodes.current.plane = el;
                }}
            >
                {/* Train */}
                <path d="M4 -6.8 L8 -2.6 M21 -6.8 L21.5 -2.2" stroke="#3F3A4A" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="8" cy="-2.3" r="2.3" fill="#27232E" />
                <circle cx="8" cy="-2.3" r="0.8" fill="#A9A3B5" />
                <circle cx="21.5" cy="-1.9" r="1.9" fill="#27232E" />
                <circle cx="21.5" cy="-1.9" r="0.65" fill="#A9A3B5" />

                {/* Empennage */}
                <path d="M-31 -13 L-34 -25.5 Q-34 -26.5 -33 -26.5 L-29 -26.5 L-19 -14.2 Z" fill={BRAND_DARK} />
                <rect x="-35" y="-14.4" width="13" height="2.2" rx="1.1" fill={BRAND_DARK} />

                {/* Fuselage */}
                <path
                    d="M-31 -13.5 L-12 -15 C-8 -15.4 -6.5 -21 -2 -21 L14 -21 C19 -20.8 22 -17 25.5 -14.5 C27.5 -13.2 28.5 -11.5 28 -9.5 C27 -7.2 24 -6.5 20 -6.5 L2 -6.5 C-5 -6.5 -10 -9 -16 -10.8 L-31 -12 Z"
                    fill={BRAND}
                />
                <path d="M-28 -11.9 L24 -10.4" stroke={BRAND_SOFT} strokeWidth="0.9" strokeLinecap="round" />

                {/* Verrière */}
                <path d="M-1.5 -19.4 L12.5 -19.4 Q17 -19.2 20.4 -15 L-3.2 -15 Q-3 -18 -1.5 -19.4 Z" fill="#EFE9FB" />
                <path d="M8.5 -19.4 L8.5 -15" stroke={BRAND} strokeWidth="1" />

                {/* Aile haute, posée sur le toit de la cabine */}
                <path d="M-4 -20.6 L13 -20.6 Q16.2 -20.7 16.2 -22.2 Q15.8 -23.8 12 -23.8 L-3 -23 Q-5.2 -22.4 -4 -20.6 Z" fill={BRAND_DARK} />

                {/* Capot + hélice */}
                <ellipse cx="28.2" cy="-10.5" rx="1.6" ry="1.9" fill="#3F3A4A" />
                <ellipse
                    ref={(el) => {
                        nodes.current.propeller = el;
                    }}
                    cx="0"
                    cy="0"
                    rx="0.9"
                    ry="7.5"
                    fill="#3F3A4A"
                    opacity="0.45"
                />
            </g>
        </svg>
    );
}
