import React from "react";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentContact {
    firstNameContact: string | null;
    lastNameContact: string | null;
    mailContact: string | null;
    phoneContact: string | null;
}

interface Props {
    contact: PaymentContact;
    intro?: string;
    className?: string;
}

/**
 * « Comment recharger mon compte » : contact du club (Club › Paramètres).
 * Réutilisé par la page portefeuille et le blocage de réservation.
 */
const ClubPaymentContact = ({ contact, intro = "Les paiements (espèces, chèque, virement, CB) se font directement auprès du club :", className }: Props) => {
    const name = [contact.firstNameContact, contact.lastNameContact?.toUpperCase()].filter(Boolean).join(" ");
    const hasContact = !!(name || contact.mailContact || contact.phoneContact);

    return (
        <div className={cn("space-y-2 text-sm", className)}>
            {hasContact ? (
                <>
                    <p className="text-slate-500">{intro}</p>
                    {name && <p className="font-semibold text-slate-800">{name}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                        {contact.phoneContact && (
                            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums select-all">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />{contact.phoneContact}
                            </span>
                        )}
                        {contact.mailContact && (
                            <span className="inline-flex items-center gap-1.5 select-all break-all">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />{contact.mailContact}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        {contact.phoneContact && (
                            <a
                                href={`tel:${contact.phoneContact}`}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Phone className="h-3.5 w-3.5" /> Appeler
                            </a>
                        )}
                        {contact.mailContact && (
                            <a
                                href={`mailto:${contact.mailContact}`}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Mail className="h-3.5 w-3.5" /> Écrire un e-mail
                            </a>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-slate-500">Adressez-vous au président ou à un instructeur du club pour recharger votre compte.</p>
            )}
        </div>
    );
};

export default ClubPaymentContact;
