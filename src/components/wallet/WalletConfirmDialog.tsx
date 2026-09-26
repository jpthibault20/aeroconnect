"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    open: boolean;
    title: string;
    children: React.ReactNode;
    confirmLabel: string;
    tone?: "primary" | "warning";
    onConfirm: () => void;
    onCancel: () => void;
}

/** Confirmation contrôlée (activation du portefeuille, retrait sous 0 €). */
const WalletConfirmDialog = ({ open, title, children, confirmLabel, tone = "primary", onConfirm, onCancel }: Props) => (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
        <DialogContent className="w-[95%] sm:max-w-[440px] gap-0 p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="bg-slate-50 px-5 py-4 border-b border-slate-100 text-left">
                <DialogTitle className="flex items-center gap-2 text-base">
                    <span className={cn("p-1.5 rounded-lg", tone === "warning" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-[#774BBE]")}>
                        <AlertTriangle className="h-4 w-4" />
                    </span>
                    {title}
                </DialogTitle>
                <DialogDescription className="sr-only">{title}</DialogDescription>
            </DialogHeader>
            <div className="px-5 py-4 text-sm text-slate-600 space-y-2">{children}</div>
            <DialogFooter className="bg-slate-50 px-5 py-3 border-t border-slate-100 gap-2">
                <Button variant="ghost" onClick={onCancel}>Annuler</Button>
                <Button
                    onClick={onConfirm}
                    className={tone === "warning" ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-[#774BBE] hover:bg-[#6538a5] text-white"}
                >
                    {confirmLabel}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default WalletConfirmDialog;
