"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { flight_sessions, NatureOfTheft, planes } from "@prisma/client"
import { ClipboardCheck, MapPin, Gauge, PlaneLanding, MessageSquare, Clock } from "lucide-react"
import { useCurrentClub } from "@/app/context/useCurrentClub"
import { cn } from "@/lib/utils"
import { flightNatures } from "@/config/config"

interface Props {
    session: flight_sessions
    onComplete: (data: any) => Promise<void>
    planes: planes[]
}

const CompleteFlightModal = ({ session, onComplete, planes }: Props) => {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { currentClub } = useCurrentClub()

    const [formData, setFormData] = useState<{
        hobbsStart: number
        hobbsEnd: number
        departurePlace: string
        arrivalPlace: string
        landings: number
        natureOfTheft: NatureOfTheft
        comment: string
    }>({
        hobbsStart: session.hobbsStart || 0,
        hobbsEnd: session.hobbsEnd || 0,
        departurePlace: session.startLocation || currentClub?.id || "",
        arrivalPlace: session.endLocation || currentClub?.id || "",
        landings: session.landings || 1,
        natureOfTheft: session.natureOfTheft?.[0] || NatureOfTheft.TRAINING,
        comment: session.flightComment || ""
    })

    // Pré-remplissage au montage
    useEffect(() => {
        if (open) {

            const sessionPlaneId = session.planeID?.[0]
            const currentPlane = planes?.find(p => p.id === sessionPlaneId)

            setFormData(prev => ({
                ...prev,
                hobbsStart: session.hobbsStart ?? currentPlane?.hobbsTotal ?? prev.hobbsStart,
                hobbsEnd: session.hobbsEnd || prev.hobbsEnd,
                departurePlace: session.startLocation || prev.departurePlace || currentClub?.id || "",
                arrivalPlace: session.endLocation || prev.arrivalPlace || currentClub?.id || "",
                landings: session.landings || prev.landings,
                natureOfTheft: session.natureOfTheft?.length > 0 ? session.natureOfTheft[0] : prev.natureOfTheft,
                comment: session.flightComment || prev.comment
            }))
        }
    }, [open, currentClub, session])

    // Calcul de la durée en dixièmes d'heure
    const durationInTenths = formData.hobbsEnd - formData.hobbsStart
    const isValidDuration = durationInTenths > 0

    // Conversion dixièmes d'heure → heures:minutes pour affichage
    const formatDuration = (tenths: number) => {
        if (tenths <= 0) return "0h00"
        const totalMinutes = Math.round(tenths * 6) // 1 dixième = 6 minutes
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return `${hours}h${minutes.toString().padStart(2, '0')}`
    }

    const handleSubmit = async () => {
        if (!isValidDuration) return
        setLoading(true)
        try {
            await onComplete({
                sessionId: session.id,
                ...formData,
                natureOfTheft: [formData.natureOfTheft],
                duration: parseFloat(durationInTenths.toFixed(1)) // Durée en dixièmes
            })
            setOpen(false)
        } catch (error) {
            console.error("Erreur clôture vol", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    className="w-full bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-sm gap-2 animate-in fade-in zoom-in h-9"
                >
                    <ClipboardCheck size={16} />
                    Clôturer le vol
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-slate-50 p-0 gap-0 overflow-hidden rounded-2xl">

                {/* Header Stylisé */}
                <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                        <Gauge size={22} />
                    </div>
                    <div>
                        <DialogTitle className="text-lg font-bold text-slate-800">
                            Rapport de vol
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium">Saisissez les données finales (compteur en dixièmes d'heure)</p>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">

                    {/* 1. HORAMETRE (Dixièmes d'heure) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Gauge size={14} /> Horamètre (en dixièmes d'heure)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 font-medium ml-1">Départ</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={formData.hobbsStart || ""}
                                    onChange={e => {
                                        const value = parseFloat(e.target.value) || 0
                                        setFormData({ ...formData, hobbsStart: Math.round(value * 10) / 10 })
                                    }}
                                    className="font-mono text-lg text-center font-bold h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 font-medium ml-1">Arrivée</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={formData.hobbsEnd || ""}
                                    onChange={e => {
                                        const value = parseFloat(e.target.value) || 0
                                        setFormData({ ...formData, hobbsEnd: Math.round(value * 10) / 10 })
                                    }}
                                    className={cn(
                                        "font-mono text-lg text-center font-bold h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors",
                                        !isValidDuration && formData.hobbsEnd !== 0 && "border-red-300 bg-red-50 text-red-600 focus:bg-red-50"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Calcul automatique de la durée */}
                        <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-500">Temps de vol calculé</span>
                                <div className="text-sm font-medium text-slate-600">
                                    <span className={cn("text-xl font-bold", isValidDuration ? "text-emerald-600" : "text-slate-400")}>
                                        {isValidDuration ? durationInTenths.toFixed(1) : "0.0"}
                                    </span>
                                    <span className="text-xs ml-1 text-slate-500">dixièmes</span>
                                </div>
                            </div>

                            {/* Affichage conversion en heures:minutes */}
                            {isValidDuration && (
                                <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                                    <Clock size={12} />
                                    <span>≈ {formatDuration(durationInTenths)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. NAVIGATION & ATTERRISSAGES */}
                    <section className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={14} /> Route & Atterrissages
                        </Label>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Départ */}
                            <div className="flex flex-col gap-1.5 w-full">
                                <span className="text-[10px] uppercase font-bold text-slate-400 text-center w-full block">Départ</span>
                                <Input
                                    value={formData.departurePlace}
                                    onChange={e => setFormData({ ...formData, departurePlace: e.target.value.toUpperCase() })}
                                    className="uppercase text-center font-bold bg-white h-11 shadow-sm"
                                    maxLength={4}
                                />
                            </div>

                            {/* Arrivée */}
                            <div className="flex flex-col gap-1.5 w-full">
                                <span className="text-[10px] uppercase font-bold text-slate-400 text-center w-full block">Arrivée</span>
                                <Input
                                    value={formData.arrivalPlace}
                                    onChange={e => setFormData({ ...formData, arrivalPlace: e.target.value.toUpperCase() })}
                                    className="uppercase text-center font-bold bg-white h-11 shadow-sm"
                                    maxLength={4}
                                />
                            </div>

                            {/* Atterrissages */}
                            <div className="flex flex-col gap-1.5 w-full">
                                <span className="text-[10px] uppercase font-bold text-slate-400 text-center w-full flex items-center justify-center gap-1">
                                    <PlaneLanding size={12} /> Atter.
                                </span>
                                <Input
                                    type="number"
                                    min={1}
                                    value={formData.landings}
                                    onChange={e => setFormData({ ...formData, landings: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className="text-center font-bold bg-white h-11 shadow-sm"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 3. NATURE DU VOL & NOTES */}
                    <div className="grid grid-cols-1 gap-4">
                        <section className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nature du vol</Label>
                            <Select
                                value={formData.natureOfTheft}
                                onValueChange={(val) => setFormData({ ...formData, natureOfTheft: val as NatureOfTheft })}
                            >
                                <SelectTrigger className="bg-white h-11 shadow-sm border-slate-200">
                                    <SelectValue placeholder="Sélectionner le type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {flightNatures.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            <div className="flex items-center gap-2">
                                                <item.icon size={16} className="text-slate-500 opacity-70" />
                                                <span className="font-medium text-slate-700">{item.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </section>

                        <section className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={14} /> Note (Optionnel)
                            </Label>
                            <Textarea
                                placeholder="Observations, météo, exercices effectués..."
                                className="bg-white resize-none text-sm min-h-[80px] shadow-sm border-slate-200 focus:border-emerald-500"
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            />
                        </section>
                    </div>
                </div>

                {/* Footer Fixe */}
                <div className="bg-white p-4 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-500">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !isValidDuration}
                        className="bg-[#774BBE] hover:bg-[#6538a5] text-white min-w-[140px] shadow-emerald-100 shadow-lg"
                    >
                        {loading ? "Traitement..." : "Valider le carnet"}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    )
}

export default CompleteFlightModal
