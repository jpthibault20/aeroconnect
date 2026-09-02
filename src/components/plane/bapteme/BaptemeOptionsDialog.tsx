"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BaptemeOption, planes } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/SpinnerVariants";
import AlertConfirmDeleted from "@/components/AlertConfirmDeleted";
import { Ticket, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getPlaneBaptemeOptions, deleteBaptemeOption } from "@/api/db/baptemeOptions";
import { formatBaptemeOptionLabel } from "@/lib/bapteme";
import BaptemeOptionForm from "./BaptemeOptionForm";

interface Props {
    plane: planes;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const BaptemeOptionsDialog = ({ plane, open, onOpenChange }: Props) => {
    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState<BaptemeOption[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingOption, setEditingOption] = useState<BaptemeOption | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getPlaneBaptemeOptions(plane.id);
        if ("error" in res) {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
            setLoading(false);
            return;
        }
        setOptions(res.options);
        setLoading(false);
    }, [plane.id]);

    useEffect(() => {
        if (open) {
            void load();
            setShowForm(false);
            setEditingOption(null);
        }
    }, [open, load]);

    const handleSaved = (option: BaptemeOption) => {
        setOptions((prev) => {
            const exists = prev.some((o) => o.id === option.id);
            const next = exists ? prev.map((o) => (o.id === option.id ? option : o)) : [...prev, option];
            return next.sort((a, b) => a.durationMin - b.durationMin);
        });
        setShowForm(false);
        setEditingOption(null);
        toast({ title: "Formule enregistrée", className: "bg-green-600 text-white border-none" });
    };

    const handleDelete = async (optionID: string) => {
        setDeletingId(optionID);
        try {
            const res = await deleteBaptemeOption(optionID);
            if ("error" in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            } else {
                setOptions((prev) => prev.filter((o) => o.id !== optionID));
                toast({ title: "Formule supprimée", className: "bg-slate-800 text-white border-none" });
            }
        } finally {
            setDeletingId(null);
        }
    };

    const anyFormOpen = showForm || editingOption != null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] sm:max-w-[560px] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="bg-slate-50 p-6 pr-12 border-b border-slate-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-purple-100 text-[#774BBE] rounded-lg flex-shrink-0">
                                <Ticket className="w-5 h-5" />
                            </div>
                            <span className="min-w-0 break-words">Baptêmes — {plane.name}</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11">
                            Durées et tarifs proposés au client sur la page de réservation publique.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0">
                    <Button
                        size="sm"
                        onClick={() => {
                            setShowForm(true);
                            setEditingOption(null);
                        }}
                        className="bg-[#774BBE] hover:bg-[#6538a5] text-white"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Formule
                    </Button>
                </div>

                <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner className="w-6 h-6 text-[#774BBE]" />
                        </div>
                    ) : (
                        <>
                            {(showForm || editingOption) && (
                                <BaptemeOptionForm
                                    planeID={plane.id}
                                    option={editingOption ?? undefined}
                                    onSaved={handleSaved}
                                    onCancel={() => {
                                        setShowForm(false);
                                        setEditingOption(null);
                                    }}
                                />
                            )}

                            {!anyFormOpen && (
                                options.length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                        Aucune formule configurée. Le client ne pourra pas choisir de durée pour
                                        cette machine.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {options.map((option) => (
                                            <div
                                                key={option.id}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                                            >
                                                <span className="text-sm font-medium text-slate-800">
                                                    {formatBaptemeOptionLabel(option)}
                                                </span>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-[#774BBE]"
                                                        onClick={() => {
                                                            setEditingOption(option);
                                                            setShowForm(false);
                                                        }}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <AlertConfirmDeleted
                                                        title="Supprimer cette formule ?"
                                                        description="Cette action est irréversible."
                                                        cancel="Annuler"
                                                        confirm="Supprimer"
                                                        confirmAction={() => handleDelete(option.id)}
                                                        loading={deletingId === option.id}
                                                    >
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertConfirmDeleted>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BaptemeOptionsDialog;
