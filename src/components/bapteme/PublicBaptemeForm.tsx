"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBaptemeRequest } from "@/api/db/bapteme";
import { baptemeRequestSchema, BaptemeRequestSchema } from "@/schemas/baptemeSchema";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronLeft, ChevronRight, PlaneTakeoff, UserRound } from "lucide-react";
import { formatPilotName, groupBaptemeSlots } from "@/lib/bapteme";
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

const PublicBaptemeForm = ({ clubID, token, clubName, slots }: Props) => {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState("");
    const [selectedSessionID, setSelectedSessionID] = useState("");
    // Doublonne `planeID` du formulaire : react-hook-form ne re-rend pas au
    // changement de valeur, et il faut savoir quel appareil est à l'écran.
    const [selectedPlaneID, setSelectedPlaneID] = useState("");
    const [selectedDayKey, setSelectedDayKey] = useState("");
    const [selectedTimeKey, setSelectedTimeKey] = useState("");
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

    // Jour → heure → pilote(s). Une liste à plat serait ingérable dès qu'un club
    // ouvre plusieurs créneaux par jour avec plusieurs pilotes.
    const days = useMemo(() => groupBaptemeSlots(slots), [slots]);

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

    // Position dans le carrousel. Repli sur 0 : tant qu'aucun appareil n'est
    // retenu, c'est la première vue qui est à l'écran.
    const currentPlaneIndex = useMemo(() => {
        if (!selectedSlot) return 0;
        const index = selectedSlot.planes.findIndex((p) => p.id === selectedPlaneID);
        return index >= 0 ? index : 0;
    }, [selectedSlot, selectedPlaneID]);

    const onSelectSession = (sessionID: string) => {
        setSelectedSessionID(sessionID);
        setValue("sessionID", sessionID, { shouldValidate: true });

        // Dans le carrousel, l'appareil affiché EST l'appareil choisi : on
        // sélectionne donc celui de la première vue, et on ramène le carrousel
        // au début (le conteneur est réutilisé d'un créneau à l'autre, sans ça
        // il resterait sur la position précédente).
        const slot = slots.find((s) => s.sessionID === sessionID);
        const firstPlaneID = slot?.planes[0]?.id ?? "";
        setSelectedPlaneID(firstPlaneID);
        setValue("planeID", firstPlaneID, { shouldValidate: false });
        carouselRef.current?.scrollTo({ left: 0 });
    };

    // Chaque étape invalide les suivantes : sans ça, changer de jour laisserait
    // sélectionnés une heure et un appareil qui n'existent plus.
    const clearSession = () => {
        setSelectedSessionID("");
        setSelectedPlaneID("");
        setValue("sessionID", "", { shouldValidate: false });
        setValue("planeID", "", { shouldValidate: false });
    };

    const onSelectTime = (timeKey: string) => {
        setSelectedTimeKey(timeKey);
        const group = selectedDay?.times.find((t) => t.timeKey === timeKey);
        // Un seul pilote sur cet horaire : aucun choix à faire, on enchaîne
        // directement sur l'appareil.
        if (group?.sessions.length === 1) {
            onSelectSession(group.sessions[0].sessionID);
        } else {
            clearSession();
        }
    };

    const onSelectDay = (dayKey: string) => {
        setSelectedDayKey(dayKey);
        setSelectedTimeKey("");
        clearSession();
    };

    const onSelectPlane = (planeID: string) => {
        setSelectedPlaneID(planeID);
        setValue("planeID", planeID, { shouldValidate: true });
    };

    // Vue courante du carrousel : déduite de la largeur d'une vue (chacune fait
    // 100 % du conteneur), donc valable aussi bien au swipe qu'aux flèches.
    const onCarouselScroll = () => {
        const scroller = carouselRef.current;
        if (!scroller || !selectedSlot) return;

        const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
        const plane = selectedSlot.planes[index];
        if (plane && plane.id !== selectedPlaneID) onSelectPlane(plane.id);
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
                            {/* Étape 1 — le jour */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">
                                    Choisissez un jour
                                </label>
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
                                                    {day.times.length} horaire
                                                    {day.times.length > 1 ? "s" : ""}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Étape 2 — l'horaire */}
                            {selectedDay && (
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
                                    {selectedTime && (
                                        <p className="text-xs text-slate-500">
                                            Durée : {selectedTime.durationMin} min
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Étape 3 — le pilote, seulement s'il y a un choix */}
                            {selectedTime && selectedTime.sessions.length > 1 && (
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
                                                    <UserRound
                                                        size={14}
                                                        className="flex-shrink-0 text-[#774BBE]"
                                                    />
                                                    {formatPilotName(s.pilotFirstName, s.pilotLastName)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors.sessionID && (
                                        <p className="text-red-500 text-xs">{errors.sessionID.message}</p>
                                    )}
                                </div>
                            )}

                            {/* Pilote imposé : simple information */}
                            {selectedSlot && selectedTime?.sessions.length === 1 && (
                                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <UserRound size={13} className="flex-shrink-0 text-[#774BBE]" />
                                    Votre pilote :{" "}
                                    <span className="font-medium text-slate-700">
                                        {formatPilotName(
                                            selectedSlot.pilotFirstName,
                                            selectedSlot.pilotLastName
                                        )}
                                    </span>
                                </p>
                            )}

                            {/* Appareil */}
                            {selectedSlot && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">
                                        {selectedSlot.planes.length > 1
                                            ? "Choisissez un appareil"
                                            : "Votre appareil"}
                                    </label>
                                    <div className="relative">
                                        {/* Carrousel en défilement natif : swipe au doigt
                                            sur mobile, flèches sur desktop, et aucune
                                            librairie embarquée sur une page publique. */}
                                        <div
                                            ref={carouselRef}
                                            onScroll={onCarouselScroll}
                                            style={{ scrollbarWidth: "none" }}
                                            className="flex snap-x snap-mandatory overflow-x-auto rounded-xl border border-slate-200 [&::-webkit-scrollbar]:hidden"
                                        >
                                            {selectedSlot.planes.map((p) => (
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

                                        {selectedSlot.planes.length > 1 && (
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
                                                    disabled={currentPlaneIndex === selectedSlot.planes.length - 1}
                                                    onClick={() => scrollToPlane(currentPlaneIndex + 1)}
                                                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"
                                                >
                                                    <ChevronRight className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Nom de l'appareil à l'écran = celui qui sera réservé */}
                                    <p className="pt-1 text-center text-sm font-semibold text-slate-800">
                                        {selectedSlot.planes[currentPlaneIndex]?.name}
                                    </p>

                                    {selectedSlot.planes.length > 1 && (
                                        <div className="flex justify-center gap-1.5">
                                            {selectedSlot.planes.map((p, index) => (
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

                                    {errors.planeID && (
                                        <p className="text-red-500 text-xs">{errors.planeID.message}</p>
                                    )}
                                </div>
                            )}

                            {/* Contact */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Prénom</label>
                                    <input className={inputClass} {...register("firstName")} />
                                    {errors.firstName && (
                                        <p className="text-red-500 text-xs">{errors.firstName.message}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Nom</label>
                                    <input className={inputClass} {...register("lastName")} />
                                    {errors.lastName && (
                                        <p className="text-red-500 text-xs">{errors.lastName.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Email</label>
                                <input type="email" className={inputClass} {...register("email")} />
                                {errors.email && (
                                    <p className="text-red-500 text-xs">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Téléphone</label>
                                <input type="tel" className={inputClass} {...register("phone")} />
                                {errors.phone && (
                                    <p className="text-red-500 text-xs">{errors.phone.message}</p>
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
                                    <p className="text-red-500 text-xs">{errors.comment.message}</p>
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
                </form>
            </div>
        </main>
    );
};

export default PublicBaptemeForm;
