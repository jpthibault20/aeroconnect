"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { validateBaptemeRequest, rejectBaptemeRequest } from "@/api/db/bapteme";
import { BAPTEME_REQUESTS_EVENT } from "@/lib/baptemeEvents";
import { Mail, Phone, PlaneTakeoff, Clock, Check, X } from "lucide-react";
import { formatSessionDate, formatSessionTime } from "@/api/global function/dateServeur";

// DTO renvoyé par getPendingBaptemeRequests (dates incluses).
export interface PendingBaptemeItem {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    comment: string | null;
    createdAt: Date | string;
    expiresAt: Date | string;
    sessionDateStart: Date | string;
    sessionDateEnd: Date | string;
    pilotFirstName: string;
    pilotLastName: string;
    planeName: string;
}

interface Props {
    pendingBaptemes: PendingBaptemeItem[];
}

// Même convention UTC que le reste des créneaux (cf. dateServeur) : le club doit
// voir exactement l'horaire que le client a réservé sur la page publique.
const formatSlot = (start: Date | string, end: Date | string) => {
    const dateStr = formatSessionDate(start, { day: "2-digit", month: "short" });
    return `${dateStr} · ${formatSessionTime(start)} → ${formatSessionTime(end)}`;
};

const PendingBaptemeRequests = ({ pendingBaptemes }: Props) => {
    const [requests, setRequests] = useState<PendingBaptemeItem[]>(pendingBaptemes);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handle = async (
        item: PendingBaptemeItem,
        action: (id: string) => Promise<{ success?: string; error?: string }>
    ) => {
        setLoadingId(item.id);
        const res = await action(item.id);
        setLoadingId(null);
        if (res.error) {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
            return;
        }
        setRequests((prev) => prev.filter((r) => r.id !== item.id));
        window.dispatchEvent(new Event(BAPTEME_REQUESTS_EVENT));
        toast({ title: "Succès", description: res.success ?? "", className: "bg-green-600 text-white border-none" });
    };

    return (
        <Card className="border-none shadow-none md:border md:shadow-sm bg-transparent md:bg-white">
            <CardHeader className="px-0 md:px-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    Baptêmes en attente
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">
                        {requests.length}
                    </span>
                </CardTitle>
                <CardDescription>Validez ou refusez les demandes de vols baptême.</CardDescription>
            </CardHeader>

            <CardContent className="p-0 md:p-6">
                {/* VUE MOBILE */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-[#774BBE] font-bold border border-purple-100">
                                    {req.firstName?.charAt(0).toUpperCase()}
                                    {req.lastName?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">
                                        {req.firstName} {req.lastName}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Pilote : {req.pilotFirstName} {req.pilotLastName}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>{formatSlot(req.sessionDateStart, req.sessionDateEnd)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PlaneTakeoff className="w-4 h-4 text-slate-400" />
                                    <span>{req.planeName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">{req.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span>{req.phone}</span>
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
                                    onClick={() => handle(req, rejectBaptemeRequest)}
                                >
                                    <X className="w-4 h-4 mr-2" /> Refuser
                                </Button>
                                <Button
                                    disabled={loadingId === req.id}
                                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                                    onClick={() => handle(req, validateBaptemeRequest)}
                                >
                                    <Check className="w-4 h-4 mr-2" /> Valider
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* VUE BUREAU */}
                <div className="hidden md:block rounded-md border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold">Client</TableHead>
                                <TableHead className="font-semibold">Créneau</TableHead>
                                <TableHead className="font-semibold">Appareil</TableHead>
                                <TableHead className="font-semibold">Contact</TableHead>
                                <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {requests.map((req) => (
                                <TableRow key={req.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium text-slate-900">
                                        {req.lastName} {req.firstName}
                                        {req.comment && (
                                            <span className="block text-xs italic text-slate-400 max-w-[200px] truncate">
                                                “{req.comment}”
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {formatSlot(req.sessionDateStart, req.sessionDateEnd)}
                                    </TableCell>
                                    <TableCell className="text-slate-600">{req.planeName}</TableCell>
                                    <TableCell className="text-slate-600 text-xs">
                                        {req.email}
                                        <br />
                                        {req.phone}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button
                                                size="sm"
                                                disabled={loadingId === req.id}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handle(req, validateBaptemeRequest)}
                                            >
                                                Valider
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={loadingId === req.id}
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handle(req, rejectBaptemeRequest)}
                                            >
                                                Refuser
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Empty state */}
                {requests.length === 0 && (
                    <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4 md:mt-0">
                        <div className="mx-auto h-12 w-12 text-slate-300 mb-3">
                            <PlaneTakeoff className="h-full w-full" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900">Aucun baptême en attente</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Les nouvelles demandes de baptême apparaîtront ici.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PendingBaptemeRequests;
