import React from "react";
import { WalletTransactionType } from "@prisma/client";
import { Plane, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { transactionLabel } from "@/lib/wallet";

interface Props {
    type: WalletTransactionType;
    authorID: string | null;
    className?: string;
}

const TransactionTypeBadge = ({ type, authorID, className }: Props) => {
    const style = type === WalletTransactionType.CREDIT
        ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: Plus }
        : type === WalletTransactionType.DEBIT
            ? { cls: "bg-purple-50 text-[#774BBE] border-purple-100", Icon: Plane }
            : { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: authorID ? SlidersHorizontal : RefreshCw };

    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
            style.cls,
            className,
        )}>
            <style.Icon className="h-3 w-3" />
            {transactionLabel(type, authorID)}
        </span>
    );
};

export default TransactionTypeBadge;
