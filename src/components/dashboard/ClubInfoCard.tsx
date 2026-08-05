"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { aircraftClasses, dayFr } from "@/config/config";
import { Building2, Mail, MapPin, Phone, Clock, CalendarDays, Plane, Timer } from "lucide-react";

/**
 * Informations non confidentielles du club, en lecture seule.
 *
 * Visible par TOUS les membres : ce sont les informations pratiques dont un
 * pilote / élève / instructeur a besoin (contact du club, adresse, horaires
 * d'ouverture, règles d'inscription). Aucune donnée nominative de membre n'y
 * figure. La modification reste dans l'onglet « Paramètres » (président/admin).
 */
const ClubInfoCard = () => {
    const { currentClub } = useCurrentClub();

    if (!currentClub) return null;

    const hours = currentClub.HoursOn ?? [];
    const openingRange =
        hours.length > 0
            ? `${String(hours[0]).padStart(2, "0")}:00 → ${String(hours[hours.length - 1]).padStart(2, "0")}:00`
            : null;

    // DaysOn stocke les libellés français (cf. dayFr) : on les réordonne pour
    // toujours afficher la semaine dans l'ordre, quel que soit l'ordre en base.
    const openDays = dayFr.filter((day) => (currentClub.DaysOn ?? []).includes(day));

    const clubClasses = aircraftClasses.filter((c) => (currentClub.classes ?? []).includes(c.id));

    const address = [
        currentClub.Address,
        [currentClub.ZipCode, currentClub.City].filter(Boolean).join(" "),
        currentClub.Country,
    ]
        .filter((part) => part && part.trim() !== "")
        .join(", ");

    const contactName = [currentClub.firstNameContact, currentClub.lastNameContact]
        .filter(Boolean)
        .join(" ");

    const subscribeRule = currentClub.userCanSubscribe
        ? currentClub.timeDelaySubscribeminutes > 0
            ? `Inscription autorisée jusqu'à ${currentClub.timeDelaySubscribeminutes} min avant le vol`
            : "Inscription libre aux sessions"
        : "Inscription réservée à l'encadrement";

    const unsubscribeRule = currentClub.userCanUnsubscribe
        ? currentClub.timeDelayUnsubscribeminutes > 0
            ? `Désinscription possible jusqu'à ${currentClub.timeDelayUnsubscribeminutes} min avant le vol`
            : "Désinscription libre"
        : "Désinscription réservée à l'encadrement";

    const labelClass = "text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2";

    // Sur téléphone, la carte parente est transparente et sans bordure (pour ne
    // pas empiler carte dans carte) : sans conteneur propre, les sections
    // s'enchaînent sans aucune séparation visuelle. Chacune devient donc une
    // carte à part entière en dessous de `md`, comme les listes mobiles du
    // reste de l'app. À partir de `md`, la grille suffit et on les efface.
    const sectionClass =
        "space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none";

    return (
        <Card className="border-none shadow-none md:border md:shadow-sm bg-transparent md:bg-white">
            <CardHeader className="px-0 md:px-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#774BBE]" />
                    {currentClub.Name}
                </CardTitle>
                <CardDescription>
                    Informations pratiques du club. Seuls le président et l&apos;administrateur
                    peuvent les modifier.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">

                    {/* Contact */}
                    <div className={sectionClass}>
                        <h3 className={labelClass}>
                            <Phone className="w-4 h-4 text-[#774BBE]" /> Contact
                        </h3>
                        <div className="space-y-2 text-sm text-slate-600">
                            {contactName && <p className="font-medium text-slate-900">{contactName}</p>}
                            {currentClub.mailContact ? (
                                <a
                                    href={`mailto:${currentClub.mailContact}`}
                                    className="flex items-center gap-2 hover:text-[#774BBE] break-all"
                                >
                                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    {currentClub.mailContact}
                                </a>
                            ) : null}
                            {currentClub.phoneContact ? (
                                <a
                                    href={`tel:${currentClub.phoneContact}`}
                                    className="flex items-center gap-2 hover:text-[#774BBE]"
                                >
                                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    {currentClub.phoneContact}
                                </a>
                            ) : null}
                            {!contactName && !currentClub.mailContact && !currentClub.phoneContact && (
                                <p className="text-slate-400">Non renseigné</p>
                            )}
                        </div>
                    </div>

                    {/* Localisation */}
                    <div className={sectionClass}>
                        <h3 className={labelClass}>
                            <MapPin className="w-4 h-4 text-[#774BBE]" /> Localisation
                        </h3>
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>{address || <span className="text-slate-400">Non renseignée</span>}</p>
                            {currentClub.defaultAirfield && (
                                <p className="text-slate-500">
                                    Terrain : <span className="font-medium text-slate-700">{currentClub.defaultAirfield}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Ouverture */}
                    <div className={sectionClass}>
                        <h3 className={labelClass}>
                            <Clock className="w-4 h-4 text-[#774BBE]" /> Ouverture
                        </h3>
                        <div className="space-y-2 text-sm text-slate-600">
                            <p className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                {openingRange ?? <span className="text-slate-400">Non renseignée</span>}
                            </p>
                            <p className="flex items-start gap-2">
                                <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <span>
                                    {openDays.length > 0 ? openDays.join(", ") : <span className="text-slate-400">Aucun jour d&apos;ouverture</span>}
                                </span>
                            </p>
                            <p className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                Session standard : {currentClub.SessionDurationMin} min
                            </p>
                        </div>
                    </div>

                    {/* Classes ULM */}
                    <div className={sectionClass}>
                        <h3 className={labelClass}>
                            <Plane className="w-4 h-4 text-[#774BBE]" /> Classes ULM du club
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {clubClasses.length > 0 ? (
                                clubClasses.map((c) => (
                                    <span
                                        key={c.id}
                                        className="text-xs font-medium text-slate-700 px-2.5 py-1 rounded-full border border-slate-200"
                                        style={{ backgroundColor: c.color }}
                                    >
                                        {c.label}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-slate-400">Non renseignées</span>
                            )}
                        </div>
                    </div>

                    {/* Règles de réservation */}
                    <div className={`${sectionClass} md:col-span-2`}>
                        <h3 className={labelClass}>
                            <CalendarDays className="w-4 h-4 text-[#774BBE]" /> Règles de réservation
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${currentClub.userCanSubscribe ? "bg-green-500" : "bg-slate-300"}`} />
                                {subscribeRule}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${currentClub.userCanUnsubscribe ? "bg-green-500" : "bg-slate-300"}`} />
                                {unsubscribeRule}
                            </li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ClubInfoCard;
