import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Pastille « Privé » / « Club » d'une machine, pour distinguer d'un coup d'œil
 * un appareil personnel d'un appareil de la flotte dans les listes de sélection.
 *
 * Reprend la charte déjà en place dans la page Avions (ambre + cadenas pour le
 * privé) afin que le même objet se lise partout de la même façon.
 */
const PlaneBadge = ({ isPrivate }: { isPrivate: boolean }) => (
    isPrivate ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
            <Lock className="w-2.5 h-2.5" />
            Privé
        </span>
    ) : (
        <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
            Club
        </span>
    )
);

export default PlaneBadge;
