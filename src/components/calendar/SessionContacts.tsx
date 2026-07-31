'use client'

import React from 'react'
import { flight_sessions, User } from '@prisma/client'
import { Phone, Mail } from 'lucide-react'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { resolveSessionContacts } from '@/lib/sessionContacts'

interface Props {
    session: flight_sessions
    usersProps: User[]
}

/**
 * Coordonnées des participants d'une séance, affichées dans le popup du
 * calendrier. Le filtrage (qui voit quoi) est fait par resolveSessionContacts :
 * ce composant ne rend rien s'il n'y a rien à montrer.
 */
const SessionContacts = ({ session, usersProps }: Props) => {
    const { currentUser } = useCurrentUser()
    if (!currentUser) return null

    const contacts = resolveSessionContacts(session, currentUser, usersProps)
    if (contacts.length === 0) return null

    return (
        <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Coordonnées</p>
            {contacts.map((contact) => (
                <div
                    key={contact.role}
                    className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2"
                >
                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{contact.label}</span>
                        <span className="text-xs font-medium text-slate-700 truncate">{contact.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {contact.phone ? (
                            <a
                                href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                                className="flex items-center gap-1.5 text-xs text-[#774BBE] hover:underline"
                            >
                                <Phone size={12} className="flex-shrink-0" />
                                <span className="font-mono">{contact.phone}</span>
                            </a>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                                <Phone size={12} className="flex-shrink-0" />
                                Téléphone non renseigné
                            </span>
                        )}
                        {contact.email ? (
                            <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center gap-1.5 text-xs text-[#774BBE] hover:underline min-w-0"
                            >
                                <Mail size={12} className="flex-shrink-0" />
                                <span className="truncate">{contact.email}</span>
                            </a>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                                <Mail size={12} className="flex-shrink-0" />
                                Email non renseigné
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default SessionContacts
