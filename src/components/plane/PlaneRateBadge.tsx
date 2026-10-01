import React from 'react'
import { MachineUsage, planes } from '@prisma/client'
import { AlertTriangle } from 'lucide-react'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { canManagePlane, isPrivatePlane } from '@/lib/planeVisibility'
import { formatHourlyRate } from '@/lib/wallet'

interface Props {
    plane: Pick<planes, 'ownerID' | 'usageTypes' | 'instructionHourlyRateCents'>
}

/**
 * Instruction rate of a CLUB plane in the lists (AER-66), for management and only
 * when the wallet is enabled: "120 €/h", or "Missing rate" on a training plane
 * (signing blocked).
 */
const PlaneRateBadge = ({ plane }: Props) => {
    const { currentClub } = useCurrentClub()
    const { currentUser } = useCurrentUser()
    if (!currentClub?.walletEnabled || !currentUser || isPrivatePlane(plane) || !canManagePlane(plane, currentUser)) {
        return null
    }

    if (plane.instructionHourlyRateCents != null) {
        return (
            <span className="inline-flex items-center text-[10px] font-medium font-mono bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5">
                {formatHourlyRate(plane.instructionHourlyRateCents)}
            </span>
        )
    }
    if (!plane.usageTypes.includes(MachineUsage.INSTRUCTION)) return null
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" />
            Tarif manquant
        </span>
    )
}

export default PlaneRateBadge
