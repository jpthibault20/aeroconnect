"use client";

import React, { useEffect, useState } from "react";
import { flight_sessions } from "@prisma/client";
import { Check, Clock, Mail, Phone, PlaneTakeoff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { rejectBaptemeRequest, validateBaptemeRequest } from "@/api/db/bapteme";
import { BAPTEME_REQUESTS_EVENT } from "@/lib/baptemeEvents";
import { formatSessionTime } from "@/api/global function/dateServeur";
import {
    useBaptemePending,
    useValidatableBaptemeSessionIDs,
} from "@/components/calendar/BaptemePendingContext";
import type { PendingBaptemeItem } from "@/components/dashboard/PendingBaptemeRequests";

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    // Popup open state: fallback when the calendar prefetch has not (yet) covered
    // these slots, notably outside the calendar.
    open: boolean;
}

/**
 * Accepts a discovery-flight request straight from a slot's popup, with exactly
 * the same rights as on the Club page (pilot assigned to the slot OR management,
 * see canValidateBapteme).
 *
 * Data comes from the cache filled in the background by the calendar
 * (BaptemePendingProvider), so the block shows as soon as the popup opens,
 * without waiting for the server. Renders nothing when there is nothing to
 * validate.
 */
const BaptemeSessionValidation = ({ sessions, setSessions, open }: Props) => {
    const { get, prefetch, resolve } = useBaptemePending();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const sessionIDs = useValidatableBaptemeSessionIDs(sessions);
    const sessionIDsKey = sessionIDs.join(",");

    // Fallback: if the calendar did not prefetch these slots (popup opened from the
    // "Flights" page, or range changed meanwhile), request them on open. No-op when
    // the cache already knows them.
    useEffect(() => {
        if (!open || sessionIDsKey === "") return;
        prefetch(sessionIDsKey.split(","));
    }, [open, sessionIDsKey, prefetch]);

    const requests = sessionIDs
        .map((id) => get(id))
        .filter((r): r is PendingBaptemeItem => !!r);

    const handle = async (
        item: PendingBaptemeItem,
        action: (id: string) => Promise<{ success?: string; error?: string }>,
        validated: boolean
    ) => {
        setLoadingId(item.id);
        const res = await action(item.id);
        setLoadingId(null);

        if (res.error) {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
            return;
        }

        resolve(item.sessionID);
        // Update the calendar without reloading: accepted, the request books the
        // customer as a guest; rejected, it reopens the slot. The flight comment is
        // already the one set when the hold was created: leave it.
        setSessions((prev) =>
            prev.map((s) =>
                s.id !== item.sessionID
                    ? s
                    : validated
                        ? {
                            ...s,
                            studentID: "invited",
                            studentFirstName: item.firstName,
                            studentLastName: item.lastName,
                            studentEmail: item.email,
                            studentPhone: item.phone,
                            studentPlaneID: item.planeID,
                        }
                        : {
                            ...s,
                            studentID: null,
                            studentFirstName: null,
                            studentLastName: null,
                            studentEmail: null,
                            studentPhone: null,
                            studentPlaneID: null,
                            studentComment: null,
                        }
            )
        );
        window.dispatchEvent(new Event(BAPTEME_REQUESTS_EVENT));
        toast({
            title: "Succès",
            description: res.success ?? "",
            className: "bg-green-600 text-white border-none",
        });
    };

    if (requests.length === 0) return null;

    return (
        <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} />
                Baptême en attente de validation
            </h3>

            {requests.map((req) => (
                <div
                    key={req.id}
                    className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-200 text-xs">
                            {req.firstName?.charAt(0).toUpperCase()}
                            {req.lastName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                                {req.lastName.toUpperCase()} {req.firstName}
                            </p>
                            <p className="text-xs text-slate-500">
                                Pilote : {req.pilotFirstName} {req.pilotLastName.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>
                                {formatSessionTime(req.sessionDateStart)} → {formatSessionTime(req.sessionDateEnd)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <PlaneTakeoff className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>{req.planeName}</span>
                            {req.optionLabel && (
                                <span className="text-xs font-semibold text-[#774BBE]">· {req.optionLabel}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <a href={`mailto:${req.email}`} className="truncate hover:underline">
                                {req.email}
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <a href={`tel:${req.phone}`} className="hover:underline">
                                {req.phone}
                            </a>
                        </div>
                        {req.comment && (
                            <p className="text-xs italic text-slate-500 pt-1">“{req.comment}”</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            disabled={loadingId === req.id}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 w-full"
                            onClick={() => handle(req, rejectBaptemeRequest, false)}
                        >
                            <X className="w-4 h-4 mr-2" /> Refuser
                        </Button>
                        <Button
                            disabled={loadingId === req.id}
                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                            onClick={() => handle(req, validateBaptemeRequest, true)}
                        >
                            <Check className="w-4 h-4 mr-2" /> Valider
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BaptemeSessionValidation;
