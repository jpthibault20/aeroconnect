import React from 'react'
import { Info } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { computeFlightChargeCents, formatCents, formatHourlyRate, parseEurosToCents } from '@/lib/wallet'

interface Props {
    value: string
    onChange: (value: string) => void
    isPrivate: boolean
    instructorRateCents: number | null | undefined
    disabled?: boolean
}

/**
 * Tarif écolage d'une machine (AER-66), affiché seulement si le portefeuille
 * du club est activé. Distinct des formules baptême, réglées ailleurs. Pour
 * une machine privée, l'élève paie le tarif instructeur du club : pas de champ.
 */
const PlaneRateField = ({ value, onChange, isPrivate, instructorRateCents, disabled }: Props) => {
    if (isPrivate) {
        return (
            <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tarification</span>
                {instructorRateCents != null ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                        Machine privée : l&apos;élève paie uniquement le tarif instructeur du club ({formatHourlyRate(instructorRateCents)}).
                    </p>
                ) : (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                        Machine privée : tarif instructeur du club non renseigné (Club › Paramètres).
                    </p>
                )}
            </div>
        )
    }

    const cents = value.trim() === '' ? null : parseEurosToCents(value)
    const invalid = value.trim() !== '' && cents == null

    return (
        <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tarification</span>
            <Label htmlFor="instructionRate" className="block text-slate-700 font-medium">Tarif écolage (€/h)</Label>
            <Input
                id="instructionRate"
                inputMode="decimal"
                placeholder="Ex. : 120,00"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="bg-slate-50 border-slate-200 font-mono"
            />
            {invalid && <p className="text-xs text-red-500">Saisissez un tarif valide (ex. : 120 ou 120,50).</p>}
            {cents === 0 && <p className="text-xs text-amber-600">Un tarif à 0 € rendra les vols d&apos;instruction gratuits sur cette machine.</p>}
            <p className="text-xs text-slate-500">
                Prix d&apos;une heure de vol d&apos;instruction, instructeur compris. Débité à la signature, au prorata des
                minutes (ex. : 45 min → {cents != null && cents > 0 ? formatCents(computeFlightChargeCents(45, cents)) : '¾ du tarif'}).
                Laisser vide si la machine n&apos;est pas utilisée en école.
            </p>
            <p className="flex items-start gap-1.5 text-xs text-slate-400">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                Les formules baptême se règlent séparément (bouton « Baptême » de la liste).
            </p>
        </div>
    )
}

export default PlaneRateField
