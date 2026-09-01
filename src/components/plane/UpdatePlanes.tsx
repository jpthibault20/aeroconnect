import { planes } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Spinner } from '../ui/SpinnerVariants'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { IoIosWarning } from 'react-icons/io'
import { Pencil, Users } from 'lucide-react' // Icônes pour le header et la propriété
import { updatePlane, updatePlaneOwner } from '@/api/db/planes'
import { getAllUser } from '@/api/db/users'
import { toast } from '@/hooks/use-toast';
import { clearCache } from '@/lib/cache'
import { DropDownClasse } from './DropDownClasse'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { canEditPlaneHobbs, canReassignPlaneOwner } from '@/lib/planeVisibility'
import PlaneImageInput from './PlaneImageInput'

// Sentinelle pour « propriétaire = le club » dans le Select (Radix n'accepte
// pas de valeur vide).
const CLUB_OWNER_VALUE = "__club__";

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
    // Compteur horaire : gestion (OWNER/ADMIN) sur toute machine, et le
    // propriétaire sur sa propre machine privée.
    const canEditHobbs = currentUser ? canEditPlaneHobbs(plane, currentUser) : false;
    // Réattribution du propriétaire : réservée au président (OWNER) et à l'admin.
    const canReassignOwner = currentUser ? canReassignPlaneOwner(currentUser) : false;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
    const [ownerLoading, setOwnerLoading] = useState(false);

    // Liste des membres du club, chargée à l'ouverture de la fiche (uniquement
    // pour président/admin, seuls à voir le sélecteur de propriétaire).
    useEffect(() => {
        if (!showPopup || !canReassignOwner || !plane.clubID) return;
        let cancelled = false;
        (async () => {
            const res = await getAllUser(plane.clubID);
            if (!cancelled && Array.isArray(res)) {
                setMembers(
                    res
                        .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() }))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            }
        })();
        return () => { cancelled = true; };
    }, [showPopup, canReassignOwner, plane.clubID]);

    const onOwnerChange = async (value: string) => {
        const newOwnerID = value === CLUB_OWNER_VALUE ? null : value;
        setOwnerLoading(true);
        try {
            const res = await updatePlaneOwner(plane.id, newOwnerID);
            if ('error' in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
                return;
            }
            setPlane((prev) => ({ ...prev, ownerID: res.ownerID, usageTypes: res.usageTypes }));
            setPlanes(planes.map((p) => (p.id === plane.id ? { ...p, ownerID: res.ownerID, usageTypes: res.usageTypes } : p)));
            clearCache(`planes:${plane.clubID}`);
            toast({
                title: "Propriétaire mis à jour",
                description: newOwnerID ? "La machine est désormais privée." : "La machine appartient désormais au club.",
                className: "bg-green-600 text-white border-none",
            });
        } catch {
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setOwnerLoading(false);
        }
    };

    // La photo est enregistrée par son propre server action, indépendamment du
    // bouton « Enregistrer » : on répercute donc tout de suite le changement
    // dans la fiche ET dans la liste, sinon la vignette resterait périmée
    // jusqu'au prochain chargement de la page.
    const onImageChange = (imagePath: string | null) => {
        setPlane((prev) => ({ ...prev, imagePath }));
        setPlanes(planes.map((p) => (p.id === plane.id ? { ...p, imagePath } : p)));
        clearCache(`planes:${plane.clubID}`);
    };

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
            setError("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            {/* Structure identique à NewPlane : p-0 gap-0 pour le layout personnalisé */}
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

                    {/* Bloc Photo */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Photo</h3>
                        <PlaneImageInput
                            planeID={plane.id}
                            planeName={plane.name}
                            imagePath={plane.imagePath}
                            disabled={loading}
                            onChange={onImageChange}
                        />
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Bloc Statut & Classe */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paramètres</h3>

                        <div className='space-y-4'>
                            {/* Propriétaire — président/admin uniquement */}
                            {canReassignOwner && (
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                        Propriétaire
                                    </Label>
                                    <Select
                                        value={plane.ownerID ?? CLUB_OWNER_VALUE}
                                        onValueChange={onOwnerChange}
                                        disabled={loading || ownerLoading}
                                    >
                                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500">
                                            <SelectValue placeholder="Sélectionner un propriétaire" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value={CLUB_OWNER_VALUE}>Club (machine collective)</SelectItem>
                                            {members.map((member) => (
                                                <SelectItem key={member.id} value={member.id}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Dropdown Classe */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">Classe</Label>
                                <DropDownClasse
                                    planeProp={plane}
                                    setPlaneProp={setPlane}
                                />
                            </div>

                            {/* Heures moteur — gestion sur toute machine, propriétaire sur la sienne */}
                            {canEditHobbs && (
                                <div className="space-y-2">
                                    <Label htmlFor="hobbsTotal" className="text-slate-700 font-medium">Heures moteur</Label>
                                    <Input
                                        id="hobbsTotal"
                                        type="number"
                                        step="0.1"
                                        value={plane.hobbsTotal ?? ""}
                                        disabled={loading}
                                        onChange={(e) => setPlane((prev) => ({ ...prev, hobbsTotal: e.target.value ? parseFloat(e.target.value) : null }))}
                                        placeholder="0.0"
                                        className="bg-slate-50 border-slate-200 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    />
                                    <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md">
                                        <IoIosWarning className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-700">
                                            Le compteur doit refléter la valeur lue sur l&apos;aéronef. Il avance
                                            automatiquement à la signature de chaque vol : ne le corriger qu&apos;en cas
                                            d&apos;erreur de saisie avérée.
                                        </p>
                                    </div>
                                </div>
                            )}

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