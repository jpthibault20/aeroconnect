import { planes, userRole } from '@prisma/client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Spinner } from '../ui/SpinnerVariants'
import { Switch } from '../ui/switch'
import { IoIosWarning } from 'react-icons/io'
import { Pencil, Clock, ShieldAlert } from 'lucide-react'
import { updatePlane } from '@/api/db/planes'
import { toast } from '@/hooks/use-toast';
import { clearCache } from '@/lib/cache'
import { DropDownClasse } from './DropDownClasse'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/app/context/useCurrentUser'

interface props {
    children: React.ReactNode
    showPopup: boolean
    setShowPopup: React.Dispatch<React.SetStateAction<boolean>>
    plane: planes
    setPlane: React.Dispatch<React.SetStateAction<planes>>
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>
    planes: planes[]
}

const UpdatePlanes = ({ children, showPopup, setShowPopup, plane, setPlane, setPlanes, planes }: props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Vérification des permissions pour modifier le Hobbs
    const canEditHobbs = currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER;

    const onClickUpdatePlane = async () => {
        setLoading(true);
        try {
            const res = await updatePlane(plane);
            if (res.error) {
                setError(res.error);
            } else if (res.success) {
                setError("");
                toast({
                    title: "Succès",
                    description: "Les informations de l'avion ont été mises à jour.",
                    className: "bg-green-600 text-white border-none",
                });

                // Update global list
                setPlanes(planes.map(p =>
                    p.id === plane.id ? { ...p, ...plane } : p
                ));

                clearCache(`planes:${plane.clubID}`);
                setShowPopup(false);
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    const handleHobbsChange = (value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setPlane((prev) => ({ ...prev, hobbsTotal: numValue }));
        } else if (value === '') {
            setPlane((prev) => ({ ...prev, hobbsTotal: 0 }));
        }
    };

    return (
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            <DialogContent className='w-[95%] sm:max-w-[500px] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col overflow-hidden max-h-[90vh]'>

                {/* --- Header Fixe --- */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <Pencil className="w-5 h-5" />
                            </div>
                            Modifier l&apos;appareil
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11">
                            Mettez à jour les informations techniques ou le statut.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* --- Corps Scrollable --- */}
                <div className='p-6 space-y-6 overflow-y-auto'>

                    {/* Bloc Identité */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identification</h3>

                        <div className='grid gap-4'>
                            <div className='space-y-2'>
                                <Label htmlFor="name" className="text-slate-700 font-medium">Nom de l&apos;appareil</Label>
                                <Input
                                    id='name'
                                    value={plane.name}
                                    disabled={loading}
                                    onChange={(e) => setPlane((prev) => ({ ...prev, name: e.target.value }))}
                                    className="bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor="immatriculation" className="text-slate-700 font-medium">Immatriculation</Label>
                                <Input
                                    id='immatriculation'
                                    value={plane.immatriculation}
                                    disabled={loading}
                                    onChange={(e) => setPlane((prev) => ({ ...prev, immatriculation: e.target.value.toUpperCase() }))}
                                    className="bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Bloc Compteur Horaire (Hobbs Total) */}
                    {canEditHobbs && (
                        <>
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Compteur horaire
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="hobbsTotal" className="text-slate-700 font-medium flex items-center gap-2">
                                        Heures totales (Hobbs)
                                        <span className="text-xs text-slate-400 font-normal">(Accès restreint)</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id='hobbsTotal'
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={plane.hobbsTotal || 0}
                                            disabled={loading}
                                            onChange={(e) => handleHobbsChange(e.target.value)}
                                            className="bg-blue-50 border-blue-200 focus:ring-blue-500 focus:border-blue-500 font-mono text-right pr-12"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
                                            heures
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />
                        </>
                    )}

                    {/* Bloc Statut & Classe */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paramètres</h3>

                        <div className='space-y-4'>
                            {/* Dropdown Classe */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Classe</Label>
                                <DropDownClasse
                                    planeProp={plane}
                                    setPlaneProp={setPlane}
                                />
                            </div>

                            {/* Switch Opérationnel - Design Carte */}
                            <div className={cn(
                                "flex items-center justify-between p-4 rounded-xl border transition-all",
                                plane.operational
                                    ? "bg-green-50 border-green-100"
                                    : "bg-red-50 border-red-100"
                            )}>
                                <div className="space-y-0.5">
                                    <Label htmlFor="operational" className="text-base font-medium text-slate-900 cursor-pointer">
                                        Statut opérationnel
                                    </Label>
                                    <p className={cn("text-xs", plane.operational ? "text-green-600" : "text-red-500")}>
                                        {plane.operational ? "L'avion peut être réservé" : "Réservations bloquées (Maintenance)"}
                                    </p>
                                </div>
                                <Switch
                                    id="operational"
                                    checked={plane.operational}
                                    onCheckedChange={(checked) => setPlane((prev) => ({ ...prev, operational: checked }))}
                                    disabled={loading}
                                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Footer Fixe --- */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0">
                    {error && (
                        <div className="text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 text-sm">
                            <IoIosWarning className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setShowPopup(false)}
                            disabled={loading}
                            className="text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={onClickUpdatePlane}
                            disabled={loading}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white min-w-[120px]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="text-white w-4 h-4" />
                                    <span>Sauvegarde...</span>
                                </div>
                            ) : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </div>

            </DialogContent>
        </Dialog>
    )
}

export default UpdatePlanes
