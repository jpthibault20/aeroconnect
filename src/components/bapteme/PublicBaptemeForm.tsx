"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBaptemeRequest } from "@/api/db/bapteme";
import { baptemeRequestSchema, BaptemeRequestSchema } from "@/schemas/baptemeSchema";
import {
    ArrowRight,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    Lock,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plane,
    PlaneTakeoff,
    UserRound,
} from "lucide-react";
import {
    BaptemeEntryPoint,
    baptemePilotKey,
    formatPilotName,
    groupBaptemeSlots,
    listBaptemePilots,
    listBaptemePlanes,
} from "@/lib/bapteme";
import { formatSessionDate, formatSessionTime } from "@/api/global function/dateServeur";

export interface PublicSlot {
    sessionID: string;
    sessionDateStart: Date | string;
    durationMin: number;
    pilotFirstName: string;
    pilotLastName: string;
    // imageUrl est null tant qu'aucune photo n'a été ajoutée à la machine.
    planes: { id: string; name: string; imageUrl: string | null }[];
}

// Coordonnées publiques du club (toutes optionnelles : un club peut n'en
// renseigner aucune). Miroir de ce que renvoie `getPublicBaptemeSlots`.
export interface ClubContact {
    firstNameContact: string | null;
    lastNameContact: string | null;
    mailContact: string | null;
    phoneContact: string | null;
    Address: string | null;
    City: string | null;
    ZipCode: string | null;
    Country: string | null;
}

interface Props {
    clubID: string;
    token: string;
    clubName: string | null;
    clubContact: ClubContact;
    slots: PublicSlot[];
}

// Instantané figé au moment de l'envoi : sert à composer le « billet
// d'embarquement » de confirmation, indépendamment des sélections.
interface Confirmation {
    passenger: string;
    dateLabel: string;
    timeLabel: string;
    planeName: string;
    pilotName: string;
}

const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-[#774BBE] focus:ring-2 focus:ring-[#774BBE]/20";

// CTA principal (Continuer / Envoyer) — même rendu pour le bouton d'avance et le
// bouton submit, pour une barre d'action homogène.
const ctaClass =
    "flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#774BBE] text-[15px] font-bold text-white shadow-lg shadow-[#774BBE]/30 transition hover:bg-[#6538A5] disabled:pointer-events-none disabled:opacity-50";

const AVATAR_GRADIENTS = [
    "from-[#9a6fe0] to-[#774BBE]",
    "from-[#f0a868] to-[#e07f3e]",
    "from-[#5fb4d4] to-[#3a86b0]",
];

// Le point d'entrée = un sélecteur segmenté non bloquant (l'ordre des étapes en
// découle). « Par date » par défaut : les disponibilités s'affichent d'emblée.
const ENTRY_POINTS: { value: BaptemeEntryPoint; label: string; Icon: typeof CalendarDays }[] = [
    { value: "date", label: "Par date", Icon: CalendarDays },
    { value: "plane", label: "Par appareil", Icon: Plane },
    { value: "pilot", label: "Par pilote", Icon: UserRound },
];

// Écrans du wizard (un par étape). L'ordre dépend du point d'entrée mais
// reproduit exactement l'ordonnancement métier existant ; « contact » clôt
// toujours le parcours.
type ScreenKey = "day" | "slot" | "plane" | "pilot" | "contact";

const SELECTION_SCREENS: Record<BaptemeEntryPoint, ScreenKey[]> = {
    date: ["day", "slot", "plane"],
    plane: ["plane", "day", "slot"],
    pilot: ["pilot", "day", "slot", "plane"],
};

const initials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

const PublicBaptemeForm = ({ clubID, token, clubName, clubContact, slots }: Props) => {
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState("");

    const [entryPoint, setEntryPoint] = useState<BaptemeEntryPoint>("date");
    const [stepIndex, setStepIndex] = useState(0);
    const [selectedPilotKey, setSelectedPilotKey] = useState("");
    const [selectedDayKey, setSelectedDayKey] = useState("");
    const [selectedTimeKey, setSelectedTimeKey] = useState("");
    const [selectedSessionID, setSelectedSessionID] = useState("");
    // Doublonne `planeID` du formulaire : react-hook-form ne re-rend pas au
    // changement de valeur, et il faut savoir quel appareil est à l'écran.
    const [selectedPlaneID, setSelectedPlaneID] = useState("");
    const carouselRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<BaptemeRequestSchema>({
        resolver: zodResolver(baptemeRequestSchema),
        defaultValues: { sessionID: "", planeID: "" },
    });

    // Catalogues complets, toutes dates confondues : ce sont eux qui servent de
    // première étape aux entrées « par appareil » et « par pilote ».
    const allPlanes = useMemo(() => listBaptemePlanes(slots), [slots]);
    const allPilots = useMemo(() => listBaptemePilots(slots), [slots]);

    /**
     * Créneaux encore compatibles avec le critère d'entrée déjà retenu. C'est ce
     * filtre qui fait « le chemin idéal » : par appareil, on ne propose que les
     * jours où cette machine vole ; par pilote, que ses journées.
     */
    const scopedSlots = useMemo(() => {
        if (entryPoint === "plane" && selectedPlaneID) {
            return slots.filter((s) => s.planes.some((p) => p.id === selectedPlaneID));
        }
        if (entryPoint === "pilot" && selectedPilotKey) {
            return slots.filter(
                (s) => baptemePilotKey(s.pilotFirstName, s.pilotLastName) === selectedPilotKey
            );
        }
        return slots;
    }, [slots, entryPoint, selectedPlaneID, selectedPilotKey]);

    const days = useMemo(() => groupBaptemeSlots(scopedSlots), [scopedSlots]);

    const selectedDay = useMemo(
        () => days.find((d) => d.dayKey === selectedDayKey),
        [days, selectedDayKey]
    );

    const selectedTime = useMemo(
        () => selectedDay?.times.find((t) => t.timeKey === selectedTimeKey),
        [selectedDay, selectedTimeKey]
    );

    const selectedSlot = useMemo(
        () => slots.find((s) => s.sessionID === selectedSessionID),
        [slots, selectedSessionID]
    );

    // Machines défilant dans le carrousel : tout le parc à l'entrée « par
    // appareil » (le choix se fait dessus), sinon celles du créneau retenu.
    const carouselPlanes = entryPoint === "plane" ? allPlanes : selectedSlot?.planes ?? [];

    const currentPlaneIndex = useMemo(() => {
        const index = carouselPlanes.findIndex((p) => p.id === selectedPlaneID);
        return index >= 0 ? index : 0;
    }, [carouselPlanes, selectedPlaneID]);

    // Nom de l'appareil retenu (récap + confirmation) : cherché dans le créneau
    // puis dans le parc complet (entrée « par appareil »).
    const selectedPlane =
        selectedSlot?.planes.find((p) => p.id === selectedPlaneID) ??
        allPlanes.find((p) => p.id === selectedPlaneID);

    // ─── Navigation du wizard ───

    const screens = useMemo<ScreenKey[]>(
        () => [...SELECTION_SCREENS[entryPoint], "contact"],
        [entryPoint]
    );
    const currentScreen = screens[Math.min(stepIndex, screens.length - 1)];

    const isScreenComplete = (screen: ScreenKey) => {
        switch (screen) {
            case "day":
                return !!selectedDayKey;
            case "slot":
                return !!selectedSessionID;
            case "plane":
                return !!selectedPlaneID;
            case "pilot":
                return !!selectedPilotKey;
            case "contact":
                return true;
        }
    };
    const canAdvance = isScreenComplete(currentScreen);

    const advance = () => setStepIndex((i) => i + 1);
    const goNext = () => {
        if (canAdvance && stepIndex < screens.length - 1) advance();
    };
    const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

    // Remonte en haut à chaque changement d'écran (et à la confirmation) : sans
    // ça, un choix pris en bas d'une longue liste laisse le nouvel écran hors vue.
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [stepIndex, confirmation]);

    // ─── Sélection : chaque étape invalide les suivantes ───

    const setPlaneValue = (planeID: string) => {
        setSelectedPlaneID(planeID);
        setValue("planeID", planeID, { shouldValidate: true });
    };

    const clearSession = () => {
        setSelectedSessionID("");
        setValue("sessionID", "", { shouldValidate: false });
    };

    const clearPlane = () => {
        setSelectedPlaneID("");
        setValue("planeID", "", { shouldValidate: false });
    };

    // Remet tout le parcours à zéro, sans toucher au point d'entrée.
    const clearSelections = () => {
        setSelectedPilotKey("");
        setSelectedDayKey("");
        setSelectedTimeKey("");
        clearSession();
        clearPlane();
    };

    const onSelectEntryPoint = (value: BaptemeEntryPoint) => {
        setEntryPoint(value);
        clearSelections();
        setStepIndex(0);
        // Le carrousel du parc est visible d'emblée : la vue affichée valant
        // sélection, on retient la première machine.
        if (value === "plane") {
            setPlaneValue(allPlanes[0]?.id ?? "");
            carouselRef.current?.scrollTo({ left: 0 });
        }
    };

    const onSelectSession = (sessionID: string) => {
        setSelectedSessionID(sessionID);
        setValue("sessionID", sessionID, { shouldValidate: true });

        // Entrée « par appareil » : la machine est déjà choisie, on n'y touche
        // pas. Sinon le carrousel arrive ensuite et affiche la première vue.
        if (entryPoint !== "plane") {
            const slot = slots.find((s) => s.sessionID === sessionID);
            setPlaneValue(slot?.planes[0]?.id ?? "");
            carouselRef.current?.scrollTo({ left: 0 });
        }
    };

    const onSelectTime = (timeKey: string) => {
        setSelectedTimeKey(timeKey);
        const group = selectedDay?.times.find((t) => t.timeKey === timeKey);
        // Un seul pilote sur cet horaire : aucun choix à faire, on enchaîne.
        if (group?.sessions.length === 1) {
            onSelectSession(group.sessions[0].sessionID);
        } else {
            clearSession();
            if (entryPoint !== "plane") clearPlane();
        }
    };

    const onSelectDay = (dayKey: string) => {
        setSelectedDayKey(dayKey);
        setSelectedTimeKey("");
        clearSession();
        if (entryPoint !== "plane") clearPlane();
    };

    const onSelectPilotFirst = (key: string) => {
        setSelectedPilotKey(key);
        setSelectedDayKey("");
        setSelectedTimeKey("");
        clearSession();
        clearPlane();
    };

    const onSelectPlaneFirst = (planeID: string) => {
        setPlaneValue(planeID);
        setSelectedDayKey("");
        setSelectedTimeKey("");
        clearSession();
    };

    // ─── Auto-avance : sélectionner suffit à passer à l'étape suivante ───
    // Pas de clic « Continuer » sur jour / horaire / pilote : le simple choix
    // enchaîne. (Le carrousel appareil, lui, se choisit au swipe → CTA explicite.)

    const handleSelectDay = (dayKey: string) => {
        onSelectDay(dayKey);
        advance();
    };

    const handleSelectTime = (timeKey: string) => {
        onSelectTime(timeKey);
        // Un seul pilote → le créneau est arrêté, on enchaîne. Sinon on reste sur
        // l'écran pour choisir le pilote (qui déclenchera l'avance à son tour).
        const group = selectedDay?.times.find((t) => t.timeKey === timeKey);
        if (group?.sessions.length === 1) advance();
    };

    const handleSelectPilotInTime = (sessionID: string) => {
        onSelectSession(sessionID);
        advance();
    };

    const handleSelectPilotFirst = (key: string) => {
        onSelectPilotFirst(key);
        advance();
    };

    // ─── Carrousel ───

    // Vue courante déduite de la largeur d'une vue (chacune fait 100 % du
    // conteneur), donc valable aussi bien au swipe qu'aux flèches.
    const onCarouselScroll = () => {
        const scroller = carouselRef.current;
        if (!scroller || carouselPlanes.length === 0) return;

        const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
        const plane = carouselPlanes[index];
        if (!plane || plane.id === selectedPlaneID) return;

        if (entryPoint === "plane") onSelectPlaneFirst(plane.id);
        else setPlaneValue(plane.id);
    };

    const scrollToPlane = (index: number) => {
        const scroller = carouselRef.current;
        if (!scroller) return;
        scroller.scrollTo({ left: index * scroller.clientWidth, behavior: "smooth" });
    };

    const onSubmit = async (data: BaptemeRequestSchema) => {
        setLoading(true);
        setServerError("");
        const res = await createBaptemeRequest({
            clubID,
            token,
            sessionID: data.sessionID,
            planeID: data.planeID,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            comment: data.comment || undefined,
        });
        setLoading(false);
        if ("error" in res) {
            setServerError(res.error ?? "Une erreur est survenue.");
            return;
        }
        // Fige les infos affichées sur le billet avant de basculer sur l'écran
        // de confirmation.
        setConfirmation({
            passenger: `${data.firstName} ${data.lastName}`.trim(),
            dateLabel: selectedSlot ? formatSessionDate(selectedSlot.sessionDateStart) : "",
            timeLabel: selectedTimeKey,
            planeName: selectedPlane?.name ?? "",
            pilotName: selectedSlot
                ? formatPilotName(selectedSlot.pilotFirstName, selectedSlot.pilotLastName)
                : "",
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    //  Blocs présentationnels
    // ─────────────────────────────────────────────────────────────────────────

    const renderHero = () => (
        <header className="relative overflow-hidden bg-gradient-to-br from-[#8256cf] via-[#774BBE] to-[#5A32A0] text-white">
            {/* halo doré discret, « heure dorée » */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    background:
                        "radial-gradient(120% 90% at 85% 0%, rgba(246,184,119,.35), transparent 55%)",
                }}
            />
            <div className="relative mx-auto max-w-lg px-5 pb-9 pt-7">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                    <PlaneTakeoff className="h-3.5 w-3.5" />
                    Vol découverte · ULM
                </p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                    Réservez votre vol baptême
                </h1>
                <p className="mt-1.5 max-w-md text-sm text-white/85">
                    {"Choisissez votre créneau, découvrez l'appareil, et laissez-nous vos coordonnées — le club confirme sous 24 h."}
                </p>
                {clubName && (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 py-1 pl-1.5 pr-3 text-xs font-semibold backdrop-blur">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#774BBE]">
                            <PlaneTakeoff className="h-3 w-3" />
                        </span>
                        {clubName}
                    </span>
                )}
            </div>
        </header>
    );

    const renderProgress = () => {
        const currentPhase = currentScreen === "contact" ? 2 : currentScreen === "plane" ? 1 : 0;
        const phases = [
            { label: "Créneau", done: !!selectedSessionID, on: currentPhase === 0 },
            { label: "Appareil", done: !!selectedPlaneID, on: currentPhase === 1 },
            { label: "Vous", done: false, on: currentPhase === 2 },
        ];
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                {phases.map((p) => (
                    <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span
                            className={`h-1 w-full rounded-full ${p.done || p.on ? "bg-[#774BBE]" : "bg-slate-200"
                                }`}
                        />
                        <span
                            className={`truncate text-[10px] font-semibold ${p.on ? "text-[#774BBE]" : p.done ? "text-slate-600" : "text-slate-400"
                                }`}
                        >
                            {p.label}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderSegmented = () => (
        <div>
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs text-slate-500">Trouver mon vol</span>
                <span className="text-xs font-bold text-slate-700">
                    {ENTRY_POINTS.find((e) => e.value === entryPoint)?.label}
                </span>
            </div>
            <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
                {ENTRY_POINTS.map(({ value, label, Icon }) => {
                    const on = entryPoint === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onSelectEntryPoint(value)}
                            aria-pressed={on}
                            className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11.5px] font-semibold transition ${on
                                ? "bg-white text-[#774BBE] shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Bandeau récap : rappelle les choix déjà faits (dont le jour sur l'écran
    // horaire) et permet d'y revenir d'un tap pour les modifier.
    const renderRecapStrip = () => {
        if (stepIndex === 0) return null;
        const chips: { idx: number; icon: typeof CalendarDays; text: string }[] = [];
        screens.forEach((key, idx) => {
            if (idx >= stepIndex || key === "contact") return;
            if (key === "day" && selectedDay)
                chips.push({ idx, icon: CalendarDays, text: formatSessionDate(selectedDay.date) });
            else if (key === "slot" && selectedSlot)
                chips.push({
                    idx,
                    icon: Clock,
                    text: `${selectedTimeKey} · ${formatPilotName(selectedSlot.pilotFirstName, selectedSlot.pilotLastName)}`,
                });
            else if (key === "plane" && selectedPlane)
                chips.push({ idx, icon: Plane, text: selectedPlane.name });
            else if (key === "pilot" && selectedPilotKey)
                chips.push({ idx, icon: UserRound, text: selectedPilotKey });
        });
        if (chips.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-1.5">
                {chips.map((c) => (
                    <button
                        key={c.idx}
                        type="button"
                        onClick={() => setStepIndex(c.idx)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#774BBE] hover:text-[#774BBE]"
                    >
                        <c.icon className="h-3.5 w-3.5 text-[#774BBE]" />
                        <span className="capitalize">{c.text}</span>
                        <Pencil className="h-3 w-3 text-slate-400" />
                    </button>
                ))}
            </div>
        );
    };

    const renderDayStep = () => (
        <div className="space-y-2">
            <p className="px-1 text-sm font-bold text-slate-700">Choisissez un jour</p>
            {days.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                    Aucune date disponible pour ce choix.
                </p>
            ) : (
                <div className="space-y-2">
                    {days.map((day) => {
                        const selected = day.dayKey === selectedDayKey;
                        const d = new Date(day.date);
                        const month = d
                            .toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })
                            .replace(".", "")
                            .toUpperCase();
                        const pilots = new Set(
                            day.times.flatMap((t) =>
                                t.sessions.map((s) => baptemePilotKey(s.pilotFirstName, s.pilotLastName))
                            )
                        ).size;
                        return (
                            <button
                                key={day.dayKey}
                                type="button"
                                onClick={() => handleSelectDay(day.dayKey)}
                                aria-pressed={selected}
                                className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected
                                    ? "border-[#774BBE] bg-[#774BBE]/[0.08]"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                            >
                                <span
                                    className={`flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl leading-none ${selected ? "bg-[#774BBE] text-white" : "bg-[#774BBE]/10 text-[#774BBE]"
                                        }`}
                                >
                                    <span className="text-lg font-extrabold">{d.getUTCDate()}</span>
                                    <span className="mt-0.5 text-[8px] font-bold tracking-wide">{month}</span>
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-bold capitalize text-slate-800">
                                        {formatSessionDate(day.date)}
                                    </span>
                                    <span className="block text-xs text-slate-500">
                                        {day.times.length} horaire{day.times.length > 1 ? "s" : ""}
                                        {pilots > 1 ? ` · ${pilots} pilotes` : ""}
                                    </span>
                                </span>
                                <ChevronRight
                                    className={`h-5 w-5 flex-none ${selected ? "text-[#774BBE]" : "text-slate-400"}`}
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderTimeStep = () =>
        selectedDay && (
            <div className="space-y-2">
                <p className="px-1 text-sm font-bold text-slate-700">Choisissez un horaire</p>
                <div className="grid grid-cols-3 gap-2">
                    {selectedDay.times.map((time) => {
                        const selected = time.timeKey === selectedTimeKey;
                        const end = formatSessionTime(
                            new Date(new Date(time.sessionDateStart).getTime() + time.durationMin * 60000)
                        );
                        return (
                            <button
                                key={time.timeKey}
                                type="button"
                                onClick={() => handleSelectTime(time.timeKey)}
                                aria-pressed={selected}
                                className={`rounded-xl border py-2.5 text-center text-sm font-bold transition ${selected
                                    ? "border-[#774BBE] bg-[#774BBE] text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                    }`}
                            >
                                {time.timeKey}
                                <span
                                    className={`block text-[10px] font-semibold ${selected ? "text-white/80" : "text-slate-400"
                                        }`}
                                >
                                    → {end}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );

    // Choix du pilote parmi ceux qui proposent l'horaire retenu. Inutile à
    // l'entrée « par pilote » (il est déjà fixé) ou s'il n'y en a qu'un.
    const renderPilotStep = () => {
        if (!selectedTime) return null;

        if (selectedTime.sessions.length === 1) {
            return (
                selectedSlot && (
                    <p className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
                        <UserRound size={13} className="flex-none text-[#774BBE]" />
                        Votre pilote :{" "}
                        <span className="font-semibold text-slate-700">
                            {formatPilotName(selectedSlot.pilotFirstName, selectedSlot.pilotLastName)}
                        </span>
                    </p>
                )
            );
        }

        return (
            <div className="space-y-2">
                <p className="px-1 text-sm font-bold text-slate-700">Choisissez votre pilote</p>
                <div className="space-y-2">
                    {selectedTime.sessions.map((s, i) => {
                        const selected = s.sessionID === selectedSessionID;
                        return (
                            <button
                                key={s.sessionID}
                                type="button"
                                onClick={() => handleSelectPilotInTime(s.sessionID)}
                                aria-pressed={selected}
                                className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition ${selected
                                    ? "border-[#774BBE] bg-[#774BBE]/[0.08]"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                            >
                                <span
                                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                                        }`}
                                >
                                    {initials(s.pilotFirstName, s.pilotLastName)}
                                </span>
                                <span className="flex-1 text-sm font-semibold text-slate-800">
                                    {formatPilotName(s.pilotFirstName, s.pilotLastName)}
                                </span>
                                <span
                                    className={`h-5 w-5 flex-none rounded-full border-2 ${selected
                                        ? "border-[#774BBE] bg-[#774BBE] shadow-[inset_0_0_0_3px_white]"
                                        : "border-slate-200"
                                        }`}
                                />
                            </button>
                        );
                    })}
                </div>
                {errors.sessionID && <p className="px-1 text-xs text-red-500">{errors.sessionID.message}</p>}
            </div>
        );
    };

    const renderPilotPicker = () => (
        <div className="space-y-2">
            <p className="px-1 text-sm font-bold text-slate-700">Choisissez votre pilote</p>
            <div className="space-y-2">
                {allPilots.map((pilot, i) => {
                    const selected = pilot.key === selectedPilotKey;
                    return (
                        <button
                            key={pilot.key}
                            type="button"
                            onClick={() => handleSelectPilotFirst(pilot.key)}
                            aria-pressed={selected}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition ${selected
                                ? "border-[#774BBE] bg-[#774BBE]/[0.08]"
                                : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                        >
                            <span
                                className={`flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                                    }`}
                            >
                                {initials(pilot.firstName, pilot.lastName)}
                            </span>
                            <span className="flex-1 text-sm font-semibold text-slate-800">
                                {formatPilotName(pilot.firstName, pilot.lastName)}
                            </span>
                            <span
                                className={`h-5 w-5 flex-none rounded-full border-2 ${selected
                                    ? "border-[#774BBE] bg-[#774BBE] shadow-[inset_0_0_0_3px_white]"
                                    : "border-slate-200"
                                    }`}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderPlaneCarousel = () => (
        <div className="space-y-3">
            <p className="px-1 text-sm font-bold text-slate-700">Votre appareil</p>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200">
                {/* Carrousel en défilement natif : swipe au doigt sur mobile,
                    flèches sur desktop, et aucune librairie embarquée sur une
                    page publique. */}
                <div
                    ref={carouselRef}
                    onScroll={onCarouselScroll}
                    style={{ scrollbarWidth: "none" }}
                    className="flex snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden"
                >
                    {carouselPlanes.map((p) => (
                        <div
                            key={p.id}
                            className="relative aspect-[16/12] w-full shrink-0 snap-center bg-slate-100"
                        >
                            {p.imageUrl ? (
                                <Image
                                    src={p.imageUrl}
                                    alt={p.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 480px"
                                    className="object-cover"
                                />
                            ) : (
                                // Placeholder « heure dorée » quand aucune photo n'est chargée.
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#8256cf] via-[#a765a6] to-[#f0a066] text-white/90">
                                    <PlaneTakeoff className="h-10 w-10" />
                                    <span className="text-xs">Photo à venir</span>
                                </div>
                            )}
                            {/* voile bas pour lisibilité du nom */}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
                            <div className="absolute inset-x-4 bottom-3 text-white">
                                <p className="text-base font-extrabold leading-tight drop-shadow">{p.name}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {carouselPlanes.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Appareil précédent"
                            disabled={currentPlaneIndex === 0}
                            onClick={() => scrollToPlane(currentPlaneIndex - 1)}
                            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            aria-label="Appareil suivant"
                            disabled={currentPlaneIndex === carouselPlanes.length - 1}
                            onClick={() => scrollToPlane(currentPlaneIndex + 1)}
                            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>

            {carouselPlanes.length > 1 && (
                <div className="flex justify-center gap-1.5">
                    {carouselPlanes.map((p, index) => (
                        <button
                            key={p.id}
                            type="button"
                            aria-label={`Voir ${p.name}`}
                            onClick={() => scrollToPlane(index)}
                            className={`h-2 rounded-full transition-all ${index === currentPlaneIndex
                                ? "w-5 bg-[#774BBE]"
                                : "w-2 bg-slate-300 hover:bg-slate-400"
                                }`}
                        />
                    ))}
                </div>
            )}

            {errors.planeID && <p className="px-1 text-xs text-red-500">{errors.planeID.message}</p>}
        </div>
    );

    const renderContact = () => (
        <div className="space-y-4">
            {/* Récap : rassure avant la saisie */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 bg-[#774BBE]/[0.08] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#774BBE]">
                    <CheckCircle2 className="h-4 w-4" />
                    Vous réservez
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                        <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Date &amp; heure
                        </span>
                        <span className="block truncate text-sm font-bold capitalize text-slate-800">
                            {selectedSlot ? formatSessionDate(selectedSlot.sessionDateStart) : ""}
                            {selectedTimeKey ? ` · ${selectedTimeKey}` : ""}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                        <Plane className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Appareil · pilote
                        </span>
                        <span className="block truncate text-sm font-bold text-slate-800">
                            {selectedPlane?.name ?? ""}
                            {selectedSlot
                                ? ` · ${formatPilotName(selectedSlot.pilotFirstName, selectedSlot.pilotLastName)}`
                                : ""}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Prénom</label>
                    <input className={inputClass} {...register("firstName")} />
                    {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Nom</label>
                    <input className={inputClass} {...register("lastName")} />
                    {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Email</label>
                <input type="email" className={inputClass} {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Téléphone</label>
                <input type="tel" className={inputClass} {...register("phone")} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Commentaire (optionnel)</label>
                <textarea
                    className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-[#774BBE] focus:ring-2 focus:ring-[#774BBE]/20"
                    placeholder="Une occasion à fêter, une question…"
                    {...register("comment")}
                />
                {errors.comment && <p className="text-xs text-red-500">{errors.comment.message}</p>}
            </div>

            {/* Emplacement captcha (différé en V1) */}
            {/* TODO: intégrer ici le widget Cloudflare Turnstile
                (NEXT_PUBLIC_TURNSTILE_SITE_KEY) et passer le token à
                createBaptemeRequest via captchaToken. */}

            {serverError && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{serverError}</p>
            )}
        </div>
    );

    // Contenu de l'écran courant.
    const renderScreen = () => {
        switch (currentScreen) {
            case "day":
                return renderDayStep();
            case "slot":
                return (
                    <div className="space-y-4">
                        {renderTimeStep()}
                        {renderPilotStep()}
                    </div>
                );
            case "plane":
                return renderPlaneCarousel();
            case "pilot":
                return renderPilotPicker();
            case "contact":
                return renderContact();
        }
    };

    // Barre d'action collante : uniquement là où un tap ne suffit pas — écran
    // appareil (sélection au swipe) et coordonnées (envoi).
    const renderActionBar = () => {
        const onContact = currentScreen === "contact";
        return (
            <div className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/90 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
                <div className="mx-auto flex max-w-lg items-center gap-2 px-4">
                    {stepIndex > 0 && (
                        <button
                            type="button"
                            onClick={goBack}
                            aria-label="Retour"
                            className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}
                    {onContact ? (
                        <button type="submit" disabled={loading} className={ctaClass}>
                            {loading ? "Envoi…" : "Envoyer ma demande"}
                            {!loading && <Check className="h-[18px] w-[18px]" />}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={!selectedPlaneID}
                            className={ctaClass}
                        >
                            Continuer
                            <ArrowRight className="h-[18px] w-[18px]" />
                        </button>
                    )}
                </div>
                {onContact && (
                    <p className="mx-auto mt-2 flex max-w-lg items-center justify-center gap-1.5 px-4 text-[11px] text-slate-400">
                        <Lock className="h-3 w-3 text-emerald-500" />
                        {"Paiement sur place · aucune donnée bancaire demandée"}
                    </p>
                )}
            </div>
        );
    };

    // Carte « Contact du club » : affichée en pied de page publique. Chaque ligne
    // n'apparaît que si le champ correspondant est renseigné ; téléphone et email
    // sont cliquables, l'adresse ouvre une recherche cartographique.
    const renderClubContact = () => {
        const { firstNameContact, lastNameContact, mailContact, phoneContact, Address, City, ZipCode, Country } = clubContact;

        const contactName = [firstNameContact, lastNameContact].filter(Boolean).join(" ").trim();
        const cityLine = [ZipCode, City].filter(Boolean).join(" ").trim();
        const addressLines = [Address, cityLine || null, Country].filter(Boolean) as string[];
        const hasAddress = addressLines.length > 0;

        // Rien à afficher si le club n'a renseigné aucune coordonnée.
        if (!contactName && !mailContact && !phoneContact && !hasAddress) return null;

        const mapsQuery = encodeURIComponent(addressLines.join(", "));

        return (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Contact du club
                </h2>
                <ul className="space-y-3">
                    {hasAddress && (
                        <li className="flex items-start gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                                <MapPin className="h-4 w-4" />
                            </span>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm leading-snug text-slate-700 transition-colors hover:text-[#774BBE]"
                            >
                                {addressLines.map((line, i) => (
                                    <span key={i} className="block">{line}</span>
                                ))}
                            </a>
                        </li>
                    )}

                    {phoneContact && (
                        <li className="flex items-center gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                                <Phone className="h-4 w-4" />
                            </span>
                            <a
                                href={`tel:${phoneContact.replace(/\s+/g, "")}`}
                                className="text-sm text-slate-700 transition-colors hover:text-[#774BBE]"
                            >
                                {phoneContact}
                            </a>
                        </li>
                    )}

                    {mailContact && (
                        <li className="flex items-center gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                                <Mail className="h-4 w-4" />
                            </span>
                            <a
                                href={`mailto:${mailContact}`}
                                className="break-all text-sm text-slate-700 transition-colors hover:text-[#774BBE]"
                            >
                                {mailContact}
                            </a>
                        </li>
                    )}

                    {contactName && (
                        <li className="flex items-center gap-3">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                                <UserRound className="h-4 w-4" />
                            </span>
                            <span className="text-sm text-slate-700">{contactName}</span>
                        </li>
                    )}
                </ul>
            </section>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    //  Écran de confirmation — « carte d'embarquement »
    // ─────────────────────────────────────────────────────────────────────────
    if (confirmation) {
        return (
            <main className="min-h-[100dvh] bg-gradient-to-b from-[#6d43b4] to-[#4d2a8c] px-4 py-10">
                <div className="mx-auto max-w-md space-y-6">
                    <div className="text-center text-white">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/15">
                            <Check className="h-7 w-7" />
                        </div>
                        <h1 className="text-xl font-extrabold">Demande envoyée !</h1>
                        <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/85">
                            Votre place est réservée provisoirement. {clubName ?? "Le club"} valide sous 24 h.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between bg-[#774BBE] px-4 py-3 text-white">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80">
                                    Vol découverte
                                </p>
                                <p className="text-sm font-extrabold">{clubName ?? "Aéroclub"}</p>
                            </div>
                            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide">
                                En attente
                            </span>
                        </div>
                        <div className="grid grid-cols-2">
                            <div className="border-t border-dashed border-slate-200 px-4 py-3">
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Date
                                </span>
                                <span className="text-sm font-bold capitalize text-slate-800">
                                    {confirmation.dateLabel}
                                </span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 px-4 py-3">
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Embarquement
                                </span>
                                <span className="text-sm font-bold text-slate-800">{confirmation.timeLabel}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 px-4 py-3">
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Appareil
                                </span>
                                <span className="text-sm font-bold text-slate-800">{confirmation.planeName}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 px-4 py-3">
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Pilote
                                </span>
                                <span className="text-sm font-bold text-slate-800">{confirmation.pilotName}</span>
                            </div>
                            <div className="col-span-2 border-t border-dashed border-slate-200 px-4 py-3">
                                <span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                    Passager
                                </span>
                                <span className="text-sm font-bold capitalize text-slate-800">
                                    {confirmation.passenger}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 border-t border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                            <CreditCard className="h-4 w-4 flex-none text-[#EA9A50]" />
                            <p className="text-[11px] text-slate-600">
                                <span className="font-semibold">Paiement sur place</span> le jour du vol. Un email de
                                confirmation vient de vous être envoyé.
                            </p>
                        </div>
                    </div>

                    {renderClubContact()}
                </div>
            </main>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Parcours
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <main className="flex min-h-[100dvh] flex-col bg-slate-50">
            {renderHero()}

            {slots.length === 0 ? (
                <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-10">
                    <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#774BBE]/10 text-[#774BBE]">
                            <Clock className="h-7 w-7" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {"Aucun créneau pour l'instant"}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {"Les prochains vols baptême ne sont pas encore ouverts. Revenez bientôt ou contactez le club ci-dessous."}
                        </p>
                    </div>
                    {renderClubContact()}
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
                    <div className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 pb-6 pt-5">
                        {renderProgress()}
                        {stepIndex === 0 && renderSegmented()}
                        {renderRecapStrip()}
                        {renderScreen()}
                        {renderClubContact()}
                    </div>
                    {(currentScreen === "plane" || currentScreen === "contact") && renderActionBar()}
                </form>
            )}
        </main>
    );
};

export default PublicBaptemeForm;
