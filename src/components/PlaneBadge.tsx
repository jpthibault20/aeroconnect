import React from 'react';
import { Lock } from 'lucide-react';

/**
 * "Private" / "Club" badge of a plane, to tell a personal plane from a fleet
 * plane at a glance in selection lists.
 *
 * Reuses the styling of the Planes page (amber + padlock for private) so the same
 * thing reads the same everywhere.
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
