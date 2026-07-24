"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBaptemeRequest } from "@/api/db/bapteme";
import { baptemeRequestSchema, BaptemeRequestSchema } from "@/schemas/baptemeSchema";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PlaneTakeoff } from "lucide-react";

export interface PublicSlot {
    sessionID: string;
    sessionDateStart: Date | string;
    durationMin: number;
    planes: { id: string; name: string }[];
}

interface Props {
    clubID: string;
    token: string;
    clubName: string | null;
    slots: PublicSlot[];
}

const formatSlotLabel = (start: Date | string, durationMin: number) => {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
    const dateStr = startDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
    });
    const time = (d: Date) =>
        d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${dateStr} · ${time(startDate)} → ${time(endDate)}`;
};

const inputClass =
    "w-full h-11 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#774BBE] focus:border-transparent";

const PublicBaptemeForm = ({ clubID, token, clubName, slots }: Props) => {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState("");
    const [selectedSessionID, setSelectedSessionID] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<BaptemeRequestSchema>({
        resolver: zodResolver(baptemeRequestSchema),
        defaultValues: { sessionID: "", planeID: "" },
    });

    const selectedSlot = useMemo(
        () => slots.find((s) => s.sessionID === selectedSessionID),
        [slots, selectedSessionID]
    );

    const onSelectSession = (sessionID: string) => {
        setSelectedSessionID(sessionID);
        setValue("sessionID", sessionID, { shouldValidate: true });
        setValue("planeID", "", { shouldValidate: false });
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
                            {/* Créneau */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">
                                    Choisissez un créneau
                                </label>
                                <select
                                    className={inputClass}
                                    value={selectedSessionID}
                                    onChange={(e) => onSelectSession(e.target.value)}
                                >
                                    <option value="">— Sélectionner —</option>
                                    {slots.map((s) => (
                                        <option key={s.sessionID} value={s.sessionID}>
                                            {formatSlotLabel(s.sessionDateStart, s.durationMin)}
                                        </option>
                                    ))}
                                </select>
                                {errors.sessionID && (
                                    <p className="text-red-500 text-xs">{errors.sessionID.message}</p>
                                )}
                            </div>

                            {/* Appareil */}
                            {selectedSlot && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">
                                        Choisissez un appareil
                                    </label>
                                    <select
                                        className={inputClass}
                                        defaultValue=""
                                        onChange={(e) =>
                                            setValue("planeID", e.target.value, { shouldValidate: true })
                                        }
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {selectedSlot.planes.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
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
