"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import FlightLoader from "@/components/loader/FlightLoader";
import FlightScene from "@/components/loader/FlightScene";
import {
    CYCLE_MS,
    MIN_DISPLAY_MS,
    SLOW_LOADING_MS,
    cyclePose,
    flightDistance,
    landingDistance,
    landingPose,
} from "@/lib/flightLoader";

/** Simulated load durations: under the display threshold, short, medium, long. */
const DURATIONS = [
    { label: "0,1 s", ms: 100, hint: "l'avion vole quand même 2 s : décollage puis atterrissage" },
    { label: "1 s", ms: 1000, hint: "idem : 2 s au total" },
    { label: "3 s", ms: 3000, hint: "atterrissage depuis la croisière" },
    { label: "10 s", ms: 10000, hint: "message « chargement long » après 8 s" },
];

const PHASES = [
    { at: 0, label: "Roulage" },
    { at: 0.06, label: "Rotation" },
    { at: 0.13, label: "Montée" },
    { at: 0.3, label: "Croisière" },
    { at: 0.6, label: "Descente" },
    { at: 0.8, label: "Arrondi / toucher" },
    { at: 0.88, label: "Décélération" },
];

type Status = "idle" | "loading" | "done";

/** Simulated load: timed, or manual (you pick the exact end time). */
function useFakeLoad() {
    const [status, setStatus] = useState<Status>("idle");
    const [duration, setDuration] = useState<number | null>(null);
    const [run, setRun] = useState(0);
    useEffect(() => {
        if (status !== "loading" || duration === null) return;
        const timer = setTimeout(() => setStatus("done"), duration);
        return () => clearTimeout(timer);
    }, [status, duration, run]);
    return {
        status,
        start: (ms: number | null) => {
            setDuration(ms);
            setRun((r) => r + 1);
            setStatus("loading");
        },
        finish: () => setStatus("done"),
        reset: () => setStatus("idle"),
    };
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
            <div className="mt-4 space-y-4">{children}</div>
        </section>
    );
}

function LoadControls({ load }: { load: ReturnType<typeof useFakeLoad> }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {DURATIONS.map((d) => (
                <Button
                    key={d.ms}
                    size="sm"
                    variant="outline"
                    title={d.hint}
                    disabled={load.status === "loading"}
                    onClick={() => load.start(d.ms)}
                >
                    {d.label}
                </Button>
            ))}
            <Button size="sm" variant="outline" disabled={load.status === "loading"} onClick={() => load.start(null)}>
                Manuel
            </Button>
            {load.status === "loading" && (
                <Button size="sm" className="bg-[#774BBE] text-white hover:bg-[#6538a5]" onClick={load.finish}>
                    Terminer le chargement
                </Button>
            )}
            {load.status === "done" && (
                <Button size="sm" variant="ghost" onClick={load.reset}>
                    Réinitialiser
                </Button>
            )}
        </div>
    );
}

function LoadedContent() {
    return (
        <div className="flex h-full w-full items-center justify-center p-6">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Contenu chargé ✓
            </div>
        </div>
    );
}

function Placeholder() {
    return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Choisis une durée pour lancer un chargement
        </div>
    );
}

// Two separate components: React really unmounts the first loader in favor of
// the second, like loading.tsx → Suspense → InitialLoading.
function StepOne() {
    return <FlightLoader variant="page" className="min-h-0" />;
}
function StepTwo() {
    return <FlightLoader variant="page" className="min-h-0" />;
}

export default function Playground() {
    const pageLoad = useFakeLoad();
    const inlineLoad = useFakeLoad();
    const [chain, setChain] = useState<0 | 1 | 2 | 3>(0);
    const [progress, setProgress] = useState(0.1);
    const [landingFrom, setLandingFrom] = useState(0.53);
    const [landingK, setLandingK] = useState(0);

    useEffect(() => {
        if (chain !== 1 && chain !== 2) return;
        const timer = setTimeout(() => setChain(chain === 1 ? 2 : 3), 1500);
        return () => clearTimeout(timer);
    }, [chain]);

    const cycleFrame = useMemo(() => {
        const frame = { pose: cyclePose(progress), distance: flightDistance(progress * CYCLE_MS) };
        return () => frame;
    }, [progress]);

    const landingFrame = useMemo(() => {
        const from = cyclePose(landingFrom);
        const frame = {
            pose: landingPose(from, landingK),
            distance: flightDistance(landingFrom * CYCLE_MS) + landingDistance(from, landingK),
        };
        return () => frame;
    }, [landingFrom, landingK]);

    const currentPhase = PHASES.filter((p) => progress >= p.at).at(-1)?.label;

    return (
        <div className="h-full overflow-y-auto bg-gray-100">
            <div className="mx-auto max-w-4xl space-y-6 p-6 pb-24">
                <header>
                    <h1 className="text-xl font-semibold text-gray-900">Banc d&apos;essai — animation de chargement</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        AER-70. Page réservée au développement (404 en production). Affichage minimal :{" "}
                        {MIN_DISPLAY_MS / 1000} s atterrissage compris, message de chargement long : {SLOW_LOADING_MS / 1000} s.
                    </p>
                </header>

                <Section
                    title="1. Chargement de page"
                    description="Variante plein écran (loading.tsx, Suspense, InitialLoading). En mode manuel, termine le chargement à différents moments du cycle : l'avion doit toujours atterrir proprement, sans saut."
                >
                    <LoadControls load={pageLoad} />
                    <div className="h-80 overflow-hidden rounded-lg border bg-gray-100">
                        {pageLoad.status === "idle" && <Placeholder />}
                        {pageLoad.status === "loading" && <FlightLoader variant="page" className="min-h-0" />}
                        {pageLoad.status === "done" && <LoadedContent />}
                    </div>
                </Section>

                <Section
                    title="2. Chargement dans une zone"
                    description="Variante compacte (portefeuille, maintenance, baptêmes). Même comportement, sur fond blanc."
                >
                    <LoadControls load={inlineLoad} />
                    <div className="h-52 overflow-hidden rounded-lg border bg-white">
                        {inlineLoad.status === "idle" && <Placeholder />}
                        {inlineLoad.status === "loading" && <FlightLoader variant="inline" />}
                        {inlineLoad.status === "done" && <LoadedContent />}
                    </div>
                </Section>

                <Section
                    title="3. Loaders enchaînés"
                    description="Deux loaders successifs de 1,5 s chacun. Attendu : un seul vol continu (ni redémarrage ni atterrissage entre les deux), puis un unique atterrissage à la fin."
                >
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setChain(1)} disabled={chain === 1 || chain === 2}>
                            Lancer l&apos;enchaînement
                        </Button>
                        {chain === 3 && (
                            <Button size="sm" variant="ghost" onClick={() => setChain(0)}>
                                Réinitialiser
                            </Button>
                        )}
                        <span className="text-xs text-gray-500">
                            {chain === 1 && "Loader 1/2"}
                            {chain === 2 && "Loader 2/2"}
                        </span>
                    </div>
                    <div className="h-80 overflow-hidden rounded-lg border bg-gray-100">
                        {chain === 0 && <Placeholder />}
                        {chain === 1 && <StepOne />}
                        {chain === 2 && <StepTwo />}
                        {chain === 3 && <LoadedContent />}
                    </div>
                </Section>

                <Section
                    title="4. Navigation réelle"
                    description="Page serveur volontairement lente : valide loading.tsx avec la navigation latérale, puis l'atterrissage au moment où la page arrive."
                >
                    <div className="flex flex-wrap gap-2">
                        {[800, 3000, 10000].map((ms) => (
                            <Button key={ms} size="sm" variant="outline" asChild>
                                <Link href={`/dev-loader-slow?ms=${ms}`}>Page lente — {ms / 1000} s</Link>
                            </Button>
                        ))}
                    </div>
                </Section>

                <Section
                    title="5. Inspecteur image par image"
                    description="Fige l'animation pour vérifier chaque phase : assiette, ombre, roues au contact de la piste."
                >
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Cycle : {(progress * 100).toFixed(1)} %</span>
                                <span className="font-medium text-[#5B3596]">{currentPhase}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={0.999}
                                step={0.001}
                                value={progress}
                                onChange={(e) => setProgress(Number(e.target.value))}
                                aria-label="Position dans le cycle"
                                className="w-full accent-[#774BBE]"
                            />
                            <div className="rounded-lg border bg-gray-100 p-2">
                                <FlightScene frame={cycleFrame} animate={false} className="h-auto w-full" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Atterrissage depuis {(landingFrom * 100).toFixed(0)} % du cycle</span>
                                <span>avancement {(landingK * 100).toFixed(0)} %</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={0.999}
                                step={0.001}
                                value={landingFrom}
                                onChange={(e) => setLandingFrom(Number(e.target.value))}
                                aria-label="Instant de fin du chargement"
                                className="w-full accent-[#774BBE]"
                            />
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.005}
                                value={landingK}
                                onChange={(e) => setLandingK(Number(e.target.value))}
                                aria-label="Avancement de l'atterrissage"
                                className="w-full accent-[#774BBE]"
                            />
                            <div className="rounded-lg border bg-gray-100 p-2">
                                <FlightScene frame={landingFrame} animate={false} className="h-auto w-full" />
                            </div>
                        </div>
                    </div>
                </Section>
            </div>
        </div>
    );
}
