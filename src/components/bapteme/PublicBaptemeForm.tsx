"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBaptemeRequest } from "@/api/db/bapteme";
import { baptemeRequestSchema, BaptemeRequestSchema } from "@/schemas/baptemeSchema";
import { Button } from "@/components/ui/button";
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
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
import { formatSessionDate } from "@/api/global function/dateServeur";

export interface PublicSlot {
    sessionID: string;
    sessionDateStart: Date | string;
    durationMin: number;
    pilotFirstName: string;
    pilotLastName: string;
    // imageUrl est null tant qu'aucune photo n'a été ajoutée à la machine.
    planes: { id: string; name: string; imageUrl: string | null }[];
}

interface Props {
    clubID: string;
    token: string;
    clubName: string | null;
    slots: PublicSlot[];
}

const inputClass =
    "w-full h-11 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#774BBE] focus:border-transparent";

// Libellé et ordre des étapes de chaque point d'entrée.
const ENTRY_POINTS: {
    value: BaptemeEntryPoint;
    label: string;
    hint: string;
    Icon: typeof CalendarDays;
}[] = [
        {
            value: "date",
            label: "Par date",
            hint: "Je sais quand je veux voler",
            Icon: CalendarDays,
        },
        {
            value: "plane",
            label: "Par appareil",
            hint: "Je choisis d'abord la machine",
            Icon: Plane,
        },
        {
            value: "pilot",
            label: "Par pilote",
            hint: "Je vole avec un pilote précis",
            Icon: UserRound,
        },
    ];

const PublicBaptemeForm = ({ clubID, token, clubName, slots }: Props) => {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState("");

    const [entryPoint, setEntryPoint] = useState<BaptemeEntryPoint | "">("");
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
        // Le carrousel du parc est visible d'emblée : la vue affichée valant
        // sélection, on retient la première machine.
        if (value === "plane") {
            setPlaneValue(allPlanes[0]?.id ?? "");
            carouselRef.current?.scrollTo({ left: 0 });
        }
    };

    // « Changer » : on revient au choix du critère, pas à un critère en
    // particulier — sinon le bouton semble inerte quand on est déjà sur celui
    // vers lequel il renvoie.
    const onResetEntryPoint = () => {
        setEntryPoint("");
        clearSelections();
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
        setSubmitted(true);
    };

    // ─── Blocs d'étapes, composés dans l'ordre voulu par le point d'entrée ───

    const renderPlaneCarousel = (title: string) => (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">{title}</label>
            <div className="relative">
                {/* Carrousel en défilement natif : swipe au doigt sur mobile,
                    flèches sur desktop, et aucune librairie embarquée sur une
                    page publique. */}
                <div
                    ref={carouselRef}
                    onScroll={onCarouselScroll}
                    style={{ scrollbarWidth: "none" }}
                    className="flex snap-x snap-mandatory overflow-x-auto rounded-xl border border-slate-200 [&::-webkit-scrollbar]:hidden"
                >
                    {carouselPlanes.map((p) => (
                        <div
                            key={p.id}
                            className="relative aspect-[4/3] w-full shrink-0 snap-center bg-slate-100"
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
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                                    <PlaneTakeoff className="h-10 w-10" />
                                    <span className="text-xs text-slate-400">
                                        Photo non disponible
                                    </span>
                                </div>
                            )}
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

            {/* L'appareil à l'écran est celui qui sera réservé */}
            <p className="pt-1 text-center text-sm font-semibold text-slate-800">
                {carouselPlanes[currentPlaneIndex]?.name}
            </p>

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

            {errors.planeID && <p className="text-xs text-red-500">{errors.planeID.message}</p>}
        </div>
    );

    const renderPilotPicker = () => (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Choisissez votre pilote</label>
            <div className="max-h-52 space-y-2 overflow-y-auto pr-0.5">
                {allPilots.map((pilot) => {
                    const selected = pilot.key === selectedPilotKey;
                    return (
                        <button
                            key={pilot.key}
                            type="button"
                            onClick={() => onSelectPilotFirst(pilot.key)}
                            aria-pressed={selected}
                            className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selected
                                ? "border-[#774BBE] bg-[#774BBE]/5 font-semibold text-slate-800"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                        >
                            <UserRound size={14} className="flex-shrink-0 text-[#774BBE]" />
                            {formatPilotName(pilot.firstName, pilot.lastName)}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderDayStep = () => (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Choisissez un jour</label>
            {days.length === 0 ? (
                <p className="rounded-xl border border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                    Aucune date disponible pour ce choix.
                </p>
            ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-0.5">
                    {days.map((day) => {
                        const selected = day.dayKey === selectedDayKey;
                        return (
                            <button
                                key={day.dayKey}
                                type="button"
                                onClick={() => onSelectDay(day.dayKey)}
                                aria-pressed={selected}
                                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${selected
                                    ? "border-[#774BBE] bg-[#774BBE]/5"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                            >
                                <span className="text-sm font-semibold capitalize text-slate-800">
                                    {formatSessionDate(day.date)}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {day.times.length} horaire{day.times.length > 1 ? "s" : ""}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderTimeStep = () =>
        selectedDay && (
            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                    Choisissez un horaire
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {selectedDay.times.map((time) => {
                        const selected = time.timeKey === selectedTimeKey;
                        return (
                            <button
                                key={time.timeKey}
                                type="button"
                                onClick={() => onSelectTime(time.timeKey)}
                                aria-pressed={selected}
                                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${selected
                                    ? "border-[#774BBE] bg-[#774BBE] text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                    }`}
                            >
                                {time.timeKey}
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
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <UserRound size={13} className="flex-shrink-0 text-[#774BBE]" />
                        Votre pilote :{" "}
                        <span className="font-medium text-slate-700">
                            {formatPilotName(selectedSlot.pilotFirstName, selectedSlot.pilotLastName)}
                        </span>
                    </p>
                )
            );
        }

        return (
            <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                    Choisissez votre pilote
                </label>
                <div className="space-y-2">
                    {selectedTime.sessions.map((s) => {
                        const selected = s.sessionID === selectedSessionID;
                        return (
                            <button
                                key={s.sessionID}
                                type="button"
                                onClick={() => onSelectSession(s.sessionID)}
                                aria-pressed={selected}
                                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${selected
                                    ? "border-[#774BBE] bg-[#774BBE]/5 font-semibold text-slate-800"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                    }`}
                            >
                                <UserRound size={14} className="flex-shrink-0 text-[#774BBE]" />
                                {formatPilotName(s.pilotFirstName, s.pilotLastName)}
                            </button>
                        );
                    })}
                </div>
                {errors.sessionID && (
                    <p className="text-xs text-red-500">{errors.sessionID.message}</p>
                )}
            </div>
        );
    };

    if (submitted) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle2 className="h-7 w-7 text-green-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Demande envoyée !</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Merci, votre demande de baptême a bien été transmise à{" "}
                        {clubName ?? "notre club"}. Vous allez recevoir un email de
                        confirmation. Un membre de l&apos;équipe validera votre créneau très
                        prochainement.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 py-8 px-4 sm:py-12">
            <div className="max-w-lg mx-auto">
                {/* En-tête */}
                <div className="text-center mb-6">
                    <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-[#774BBE]/10 flex items-center justify-center">
                        <PlaneTakeoff className="h-7 w-7 text-[#774BBE]" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Réservez votre vol baptême
                    </h1>
                    {clubName && <p className="text-slate-500 mt-1">{clubName}</p>}
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5"
                >
                    {slots.length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-6">
                            Aucun créneau baptême n&apos;est disponible pour le moment. Merci
                            de revenir plus tard.
                        </p>
                    ) : (
                        <>
                            {/* Étape 0 — par quoi le client veut-il commencer ? */}
                            {!entryPoint ? (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">
                                        Comment souhaitez-vous choisir ?
                                    </label>
                                    <div className="space-y-2">
                                        {ENTRY_POINTS.map(({ value, label, hint, Icon }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => onSelectEntryPoint(value)}
                                                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-[#774BBE] hover:bg-[#774BBE]/5"
                                            >
                                                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#774BBE]/10 text-[#774BBE]">
                                                    <Icon className="h-5 w-5" />
                                                </span>
                                                <span>
                                                    <span className="block text-sm font-semibold text-slate-800">
                                                        {label}
                                                    </span>
                                                    <span className="block text-xs text-slate-500">
                                                        {hint}
                                                    </span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="text-xs text-slate-500">
                                        Recherche{" "}
                                        <span className="font-medium text-slate-700">
                                            {ENTRY_POINTS.find((e) => e.value === entryPoint)?.label.toLowerCase()}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onResetEntryPoint}
                                        className="text-xs font-medium text-[#774BBE] hover:underline"
                                    >
                                        Changer
                                    </button>
                                </div>
                            )}

                            {/* Chemin « par date » : jour → horaire → pilote → appareil */}
                            {entryPoint === "date" && (
                                <>
                                    {renderDayStep()}
                                    {renderTimeStep()}
                                    {renderPilotStep()}
                                    {selectedSlot && renderPlaneCarousel("Choisissez un appareil")}
                                </>
                            )}

                            {/* Chemin « par appareil » : appareil → jour → horaire → pilote */}
                            {entryPoint === "plane" && (
                                <>
                                    {renderPlaneCarousel("Choisissez un appareil")}
                                    {selectedPlaneID && renderDayStep()}
                                    {renderTimeStep()}
                                    {renderPilotStep()}
                                </>
                            )}

                            {/* Chemin « par pilote » : pilote → jour → horaire → appareil */}
                            {entryPoint === "pilot" && (
                                <>
                                    {renderPilotPicker()}
                                    {selectedPilotKey && renderDayStep()}
                                    {renderTimeStep()}
                                    {selectedSlot && renderPlaneCarousel("Choisissez un appareil")}
                                </>
                            )}

                            {/* Contact — seulement une fois le créneau et l'appareil arrêtés */}
                            {selectedSessionID && selectedPlaneID && (
                                <>
                                    <div className="h-px w-full bg-slate-100" />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">
                                                Prénom
                                            </label>
                                            <input className={inputClass} {...register("firstName")} />
                                            {errors.firstName && (
                                                <p className="text-red-500 text-xs">
                                                    {errors.firstName.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">
                                                Nom
                                            </label>
                                            <input className={inputClass} {...register("lastName")} />
                                            {errors.lastName && (
                                                <p className="text-red-500 text-xs">
                                                    {errors.lastName.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            className={inputClass}
                                            {...register("email")}
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-xs">
                                                {errors.email.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">
                                            Téléphone
                                        </label>
                                        <input type="tel" className={inputClass} {...register("phone")} />
                                        {errors.phone && (
                                            <p className="text-red-500 text-xs">
                                                {errors.phone.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">
                                            Commentaire (optionnel)
                                        </label>
                                        <textarea
                                            className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#774BBE] focus:border-transparent"
                                            placeholder="Une occasion particulière, une question…"
                                            {...register("comment")}
                                        />
                                        {errors.comment && (
                                            <p className="text-red-500 text-xs">
                                                {errors.comment.message}
                                            </p>
                                        )}
                                    </div>

                                    {/* Emplacement captcha (différé en V1) */}
                                    {/* TODO: intégrer ici le widget Cloudflare Turnstile
                                        (NEXT_PUBLIC_TURNSTILE_SITE_KEY) et passer le token à
                                        createBaptemeRequest via captchaToken. */}

                                    {serverError && (
                                        <p className="text-red-600 text-sm bg-red-50 rounded-md p-3">
                                            {serverError}
                                        </p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#774BBE] hover:bg-[#6538a5] text-white h-11"
                                    >
                                        {loading ? "Envoi…" : "Envoyer ma demande"}
                                    </Button>

                                    <p className="text-[11px] text-slate-400 text-center">
                                        Paiement sur place. Votre place est réservée provisoirement
                                        jusqu&apos;à validation par le club.
                                    </p>
                                </>
                            )}
                        </>
                    )}
                </form>
            </div>
        </main>
    );
};

export default PublicBaptemeForm;
