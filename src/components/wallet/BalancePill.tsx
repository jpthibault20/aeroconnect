import React from "react";
import { AlertTriangle, Ban, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { BalanceState, formatCents } from "@/lib/wallet";

// Styles of the 3 balance states, used everywhere (menu, lists, cards).
export const BALANCE_STATE_STYLES: Record<BalanceState, { pill: string; text: string; Icon: React.ElementType }> = {
    ok: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-600", Icon: Wallet },
    low: { pill: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-600", Icon: AlertTriangle },
    blocked: { pill: "bg-red-50 text-red-700 border-red-200", text: "text-red-600", Icon: Ban },
};

/** Bookings blocked but no debt (threshold ≥ 0 €) => amber rather than red. */
export function balanceStateStyle(state: BalanceState, balanceCents: number) {
    return state === "blocked" && balanceCents >= 0
        ? { ...BALANCE_STATE_STYLES.low, Icon: Ban }
        : BALANCE_STATE_STYLES[state];
}

interface Props {
    balanceCents: number;
    state: BalanceState;
    label?: string;
    showIcon?: boolean;
    className?: string;
}

const BalancePill = ({ balanceCents, state, label, showIcon = true, className }: Props) => {
    const { pill, Icon } = balanceStateStyle(state, balanceCents);
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold font-mono tabular-nums whitespace-nowrap",
            pill,
            className,
        )}>
            {showIcon && <Icon className="h-3 w-3" />}
            {label ? `${label} ` : ""}{formatCents(balanceCents)}
        </span>
    );
};

export default BalancePill;
