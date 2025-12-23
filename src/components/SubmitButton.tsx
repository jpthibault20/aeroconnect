import React from 'react';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Spinner } from './ui/SpinnerVariants';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { flight_sessions, userRole } from '@prisma/client';
import { cn } from '@/lib/utils';

interface SubmitButtonProps {
    submitDisabled: boolean;
    onSubmit: () => void;
    loading: boolean;
    error: string;
    disabledMessage: string;
    session: flight_sessions | undefined;
}

const SubmitButton = ({ submitDisabled, onSubmit, loading, error, disabledMessage, session }: SubmitButtonProps) => {
    const { currentUser } = useCurrentUser()

    let isBtnDisabled = submitDisabled;
    let localDisabledMessage = disabledMessage;

    if (currentUser?.role === userRole.USER && !session?.natureOfTheft.includes("DISCOVERY")) {
        isBtnDisabled = true;
        localDisabledMessage = "Vous n'avez pas les droits nécessaires pour cette action."
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Zone de messages (Warning / Info) */}
            {isBtnDisabled && localDisabledMessage && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{localDisabledMessage}</span>
                </div>
            )}

            {/* Message d'erreur API */}
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-3 text-sm text-red-800 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Bouton d'action */}
            <Button
                className={cn(
                    "w-full h-11 text-base font-medium transition-all shadow-sm",
                    isBtnDisabled
                        ? "bg-slate-100 text-slate-400 hover:bg-slate-100 border border-slate-200 cursor-not-allowed"
                        : "bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-purple-200 hover:shadow-purple-300 hover:-translate-y-0.5"
                )}
                disabled={isBtnDisabled || loading}
                onClick={onSubmit}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Spinner className="text-white w-5 h-5" />
                        <span>Traitement en cours...</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Valider la réservation</span>
                    </div>
                )}
            </Button>
        </div>
    )
};

export default SubmitButton;