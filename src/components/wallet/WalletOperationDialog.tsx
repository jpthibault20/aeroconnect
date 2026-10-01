"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PaymentMethod } from "@prisma/client";
import { AlertTriangle, Check, CircleMinus, CirclePlus, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/SpinnerVariants";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { recordWalletOperation } from "@/api/db/wallet";
import { walletOperationSchema } from "@/schemas/wallet";
import {
    balanceTextClass,
    canBookWithBalance,
    centsToInput,
    formatCents,
    parseEurosToCents,
    PAYMENT_METHOD_LABELS,
    PAYMENT_METHODS,
    QUICK_AMOUNTS_CENTS,
    UNUSUAL_AMOUNT_CENTS,
} from "@/lib/wallet";
import { emitWalletChanged } from "@/lib/walletEvents";
import WalletConfirmDialog from "./WalletConfirmDialog";

export interface OperationMember {
    id: string;
    firstName: string;
    lastName: string;
    balanceCents: number;
}

export type OperationKind = "CREDIT" | "WITHDRAW";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: OperationMember[];
    /** Member preselected (and locked) when coming from a row. */
    memberID?: string | null;
    initialKind?: OperationKind;
    onDone?: (memberID: string, balanceCents: number) => void;
}

const memberName = (m: OperationMember) => `${m.firstName} ${m.lastName.toUpperCase()}`;

/**
 * Credit (payment received) or withdrawal / correction of a wallet by management
 * (AER-66). The amount is always entered as positive: the chosen tile sets the
 * direction. A validated operation can no longer be deleted.
 */
const WalletOperationDialog = ({ open, onOpenChange, members, memberID, initialKind = "CREDIT", onDone }: Props) => {
    const [selectedID, setSelectedID] = useState<string>("");
    const [kind, setKind] = useState<OperationKind>(initialKind);
    const [amountInput, setAmountInput] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [comment, setComment] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmNegative, setConfirmNegative] = useState(false);
    const { currentClub } = useCurrentClub();

    // Reset the form on every open.
    useEffect(() => {
        if (!open) return;
        setSelectedID(memberID ?? "");
        setKind(initialKind);
        setAmountInput("");
        setPaymentMethod(null);
        setComment("");
        setError("");
        setConfirmNegative(false);
    }, [open, memberID, initialKind]);

    const member = members.find((m) => m.id === selectedID) ?? null;
    const amountCents = amountInput.trim() === "" ? null : parseEurosToCents(amountInput);
    const signed = amountCents != null ? (kind === "CREDIT" ? amountCents : -amountCents) : 0;
    const newBalance = member && amountCents ? member.balanceCents + signed : null;
    const isCredit = kind === "CREDIT";

    const sortedMembers = useMemo(
        () => [...members].sort((a, b) => a.lastName.localeCompare(b.lastName)),
        [members]
    );

    const validate = (): string | null => {
        if (amountInput.trim() !== "" && amountCents == null) return "Saisissez un montant valide (2 décimales au plus).";
        const parsed = walletOperationSchema.safeParse({
            memberID: selectedID,
            kind,
            amountCents: amountCents ?? 0,
            paymentMethod,
            comment: comment.trim() || undefined,
        });
        return parsed.success ? null : parsed.error.issues[0]?.message ?? "Saisie invalide.";
    };

    const submit = async () => {
        setError("");
        const invalid = validate();
        if (invalid) {
            setError(invalid);
            return;
        }
        // Withdrawal taking the balance below 0: explicit confirmation.
        if (!isCredit && newBalance != null && newBalance < 0 && !confirmNegative) {
            setConfirmNegative(true);
            return;
        }
        setConfirmNegative(false);
        setLoading(true);
        try {
            const res = await recordWalletOperation({
                memberID: selectedID,
                kind,
                amountCents: amountCents as number,
                paymentMethod,
                comment: comment.trim() || undefined,
            });
            if ("error" in res && res.error) {
                setError(res.error);
                return;
            }
            if (res.success) {
                toast({
                    title: res.success,
                    description: `${formatCents(res.amountCents)} ${isCredit ? "crédités à" : "retirés à"} ${res.memberName}. Nouveau solde : ${formatCents(res.balanceCents)}.`,
                    className: "bg-green-600 text-white border-none",
                });
                emitWalletChanged();
                onDone?.(selectedID, res.balanceCents);
                onOpenChange(false);
            }
        } catch {
            setError("Une erreur technique est survenue.");
        } finally {
            setLoading(false);
        }
    };

    const title = memberID ? (isCredit ? "Enregistrer un paiement" : "Retrait ou correction") : "Enregistrer une opération";

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
                <DialogContent className="w-[95%] sm:max-w-[520px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-xl sm:rounded-2xl !flex !flex-col">
                    <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-100 flex-shrink-0">
                        <DialogHeader className="text-left">
                            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="p-2 bg-[#774BBE]/10 rounded-lg"><Wallet className="w-5 h-5 text-[#774BBE]" /></span>
                                {title}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                                Le solde du membre est mis à jour immédiatement.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
                        {/* Member */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Membre</Label>
                            <Select value={selectedID} onValueChange={setSelectedID} disabled={!!memberID || loading}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Sélectionner un membre" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {sortedMembers.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <span className="flex items-center gap-3">
                                                <span>{m.lastName.toUpperCase()} {m.firstName}</span>
                                                <span className={cn("text-xs font-mono tabular-nums", balanceTextClass(m.balanceCents, currentClub?.walletBookingMinCents ?? 0))}>
                                                    {formatCents(m.balanceCents)}
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {member && (
                                <p className={cn("text-xs font-mono tabular-nums", member.balanceCents < 0 ? "text-red-600" : member.balanceCents === 0 ? "text-amber-600" : "text-slate-500")}>
                                    Solde actuel : {formatCents(member.balanceCents)}
                                </p>
                            )}
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* Operation type */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Type d&apos;opération</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setKind("CREDIT")}
                                    disabled={loading}
                                    className={cn(
                                        "rounded-xl border-2 p-3 text-left transition-colors",
                                        isCredit ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
                                    )}
                                >
                                    <span className={cn("flex items-center gap-1.5 text-sm font-semibold", isCredit ? "text-emerald-700" : "text-slate-700")}>
                                        <CirclePlus className="w-4 h-4" /> Paiement reçu
                                    </span>
                                    <span className="text-xs text-slate-500">Ajoute au solde</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setKind("WITHDRAW")}
                                    disabled={loading}
                                    className={cn(
                                        "rounded-xl border-2 p-3 text-left transition-colors",
                                        !isCredit ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"
                                    )}
                                >
                                    <span className={cn("flex items-center gap-1.5 text-sm font-semibold", !isCredit ? "text-amber-700" : "text-slate-700")}>
                                        <CircleMinus className="w-4 h-4" /> Retrait / correction
                                    </span>
                                    <span className="text-xs text-slate-500">Retire du solde</span>
                                </button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label htmlFor="walletAmount" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Montant (€)</Label>
                            <Input
                                id="walletAmount"
                                inputMode="decimal"
                                placeholder="Ex. : 150,00"
                                value={amountInput}
                                disabled={loading}
                                onChange={(e) => setAmountInput(e.target.value)}
                                className="bg-slate-50 border-slate-200 font-mono text-base"
                            />
                            {isCredit && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {QUICK_AMOUNTS_CENTS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            disabled={loading}
                                            onClick={() => setAmountInput(centsToInput(c))}
                                            className={cn(
                                                "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                                                amountCents === c ? "border-[#774BBE] bg-purple-50 text-[#774BBE]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {formatCents(c).replace(",00", "")}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {amountCents != null && amountCents > UNUSUAL_AMOUNT_CENTS && (
                                <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    Montant inhabituel ({formatCents(amountCents)}) : vérifiez la saisie.
                                </p>
                            )}
                        </div>

                        {/* Payment method */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {isCredit ? "Moyen de paiement" : "Moyen de remboursement (si remboursement)"}
                            </Label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {PAYMENT_METHODS.map((pm) => (
                                    <button
                                        key={pm}
                                        type="button"
                                        disabled={loading}
                                        onClick={() => setPaymentMethod(paymentMethod === pm ? null : pm)}
                                        className={cn(
                                            "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                                            paymentMethod === pm ? "border-[#774BBE] bg-purple-50 text-[#774BBE]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {PAYMENT_METHOD_LABELS[pm]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="space-y-1.5">
                            <Label htmlFor="walletComment" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {isCredit ? "Commentaire" : "Motif (obligatoire)"}
                            </Label>
                            <Textarea
                                id="walletComment"
                                value={comment}
                                disabled={loading}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={isCredit ? "Ex. : chèque n° 1234567, forfait 5 h" : "Ex. : remboursement du solde, correction d'une erreur de saisie"}
                                className="bg-slate-50 border-slate-200 min-h-[60px] text-sm"
                            />
                        </div>

                        {/* Summary: old → new balance */}
                        {member && newBalance != null && (
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Solde actuel</p>
                                    <p className={cn("font-mono tabular-nums font-bold", member.balanceCents < 0 ? "text-red-600" : member.balanceCents === 0 ? "text-amber-600" : "text-slate-800")}>
                                        {formatCents(member.balanceCents)}
                                    </p>
                                </div>
                                <span className="text-slate-300">→</span>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nouveau solde</p>
                                    <p className={cn("font-mono tabular-nums font-bold", newBalance < 0 ? "text-red-600" : newBalance === 0 ? "text-amber-600" : "text-emerald-600")}>
                                        {formatCents(newBalance)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-100 flex flex-col gap-3 flex-shrink-0">
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2.5 rounded-md text-sm border border-red-100">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <p className="flex items-start gap-1.5 text-xs text-slate-400">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            Une opération validée ne peut plus être supprimée. En cas d&apos;erreur, saisissez une opération inverse.
                        </p>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="text-slate-500">
                                Annuler
                            </Button>
                            <Button
                                onClick={submit}
                                disabled={loading}
                                className={cn(
                                    "text-white sm:min-w-[170px]",
                                    isCredit ? "bg-[#774BBE] hover:bg-[#6538a5]" : "bg-amber-600 hover:bg-amber-700"
                                )}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2"><Spinner className="w-4 h-4 text-white" /> Enregistrement…</span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Check className="w-4 h-4" />
                                        {isCredit ? "Créditer" : "Retirer"}{amountCents ? ` ${formatCents(amountCents)}` : ""}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <WalletConfirmDialog
                open={confirmNegative}
                title="Confirmer le retrait ?"
                confirmLabel="Confirmer le retrait"
                tone="warning"
                onCancel={() => setConfirmNegative(false)}
                onConfirm={submit}
            >
                {member && newBalance != null && (
                    <p>
                        Le solde de {memberName(member)} passera à{" "}
                        <span className="font-mono tabular-nums font-semibold text-red-600">{formatCents(newBalance)}</span>.
                        {canBookWithBalance(newBalance, currentClub?.walletBookingMinCents ?? 0)
                            ? " Ce membre sera à découvert."
                            : " Ce membre ne pourra plus s'inscrire aux créneaux tant que son solde n'est pas rechargé."}
                    </p>
                )}
            </WalletConfirmDialog>
        </>
    );
};

export default WalletOperationDialog;
