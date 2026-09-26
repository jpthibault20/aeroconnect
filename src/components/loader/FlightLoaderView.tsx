"use client";

import React from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SLOW_LOADING_MESSAGE, type LoaderVariant } from "@/lib/flightLoader";
import FlightScene, { type FrameSource } from "./FlightScene";

interface Props {
    variant: LoaderVariant;
    frame: FrameSource;
    animate: boolean;
    showMessages: boolean;
    message: string;
    slow: boolean;
}

const MESSAGE_TRANSITION = { duration: 0.22, ease: "easeOut" } as const;

/**
 * Layout shared by the loader and its landing: both must overlap pixel-perfectly
 * so the handoff is invisible.
 */
export default function FlightLoaderView({ variant, frame, animate, showMessages, message, slow }: Props) {
    const page = variant === "page";
    return (
        // reducedMotion="user": if the OS asks for less motion, Motion drops movement
        // and keeps only fades.
        <MotionConfig reducedMotion="user">
            <div className={cn("flex w-full flex-col items-center", page ? "max-w-[420px] gap-2 px-4" : "max-w-[220px] gap-1")}>
                <FlightScene frame={frame} animate={animate} className="h-auto w-full" />
                {showMessages && (
                    <>
                        <p
                            aria-hidden="true"
                            className={cn("h-5 font-medium text-[#5B3596]", page ? "text-sm" : "text-xs")}
                        >
                            {/* mode="wait": the old message leaves before the next one enters. */}
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={message}
                                    className="inline-block"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={MESSAGE_TRANSITION}
                                >
                                    {message}
                                </motion.span>
                            </AnimatePresence>
                        </p>
                        {page && (
                            // Space reserved even when empty: the text appearing does not shift the plane.
                            <motion.p
                                aria-hidden="true"
                                className="min-h-8 max-w-[280px] text-center text-xs text-gray-500"
                                initial={false}
                                animate={{ opacity: slow ? 1 : 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {SLOW_LOADING_MESSAGE}
                            </motion.p>
                        )}
                    </>
                )}
            </div>
        </MotionConfig>
    );
}
