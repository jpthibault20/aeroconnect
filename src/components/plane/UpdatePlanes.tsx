import { planes } from '@prisma/client'
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Spinner } from '../ui/SpinnerVariants'
import { Switch } from '../ui/switch'
import { Check, X } from 'lucide-react'
import { IoIosWarning } from 'react-icons/io'
import { updatePlane } from '@/api/db/planes'
import { toast } from '@/hooks/use-toast';
import { clearCache } from '@/lib/cache'
import { DropDownClasse } from './DropDownClasse'


interface props {
    children: React.ReactNode
    showPopup: boolean
    setShowPopup: React.Dispatch<React.SetStateAction<boolean>>
    plane: planes
    setPlanes: React.Dispatch<React.SetStateAction<planes[]>>
    planes: planes[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UpdatePlanes = ({ children, showPopup, setShowPopup, plane, setPlanes, planes }: props) => {
    const [planeState, setPlaneState] = useState<planes>(plane);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onClickUpdatePlane = async () => {
        setLoading(true);
        console.log(planeState)
        try {
            const res = await updatePlane(planeState);
            if (res.error) {
                setError(res.error);
            } else if (res.success) {
                setError("");
                toast({
                    title: "Avion mis à jour avec succès",
                    duration: 5000,
                    style: {
                        background: '#0bab15', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
                setPlanes(planes.map(p =>
                    p.id === planeState.id ? { ...p, ...planeState } : p
                ));
                clearCache(`planes:${planeState.clubID}`)
                setShowPopup(false);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='flex justify-center items-center'>
            <Dialog open={showPopup} onOpenChange={setShowPopup}>
                <DialogTrigger asChild >
                    {children}
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px]'>
                    <DialogHeader>
                        <DialogTitle>Mise à jour du profil</DialogTitle>
                        <DialogDescription>
                            Modifiez les informations du profil de l&apos;utilisateur
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className='' >
                        <div className='space-y-3'>

                            {/* Nom et Immatriculation */}
                            <div className='grid grid-cols-2 gap-4 py-2'>
                                <div className='grid items-center gap-2'>
                                    <Label>
                                        Nom
                                    </Label>
                                    <Input
                                        id='name'
                                        value={planeState.name}
                                        disabled={loading}
                                        onChange={(e) => setPlaneState((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className='grid items-center gap-2'>
                                    <Label>
                                        Immatriculation
                                    </Label>
                                    <Input
                                        id='immatriculation'
                                        value={planeState.immatriculation}
                                        disabled={loading}
                                        onChange={(e) => setPlaneState((prev) => ({ ...prev, immatriculation: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Operational et classes */}
                        <div className='grid grid-cols-2 gap-4 py-2'>
                            <div className='grid items-center gap-2'>
                                <Label>
                                    Avion opérationel
                                </Label>
                                <div>
                                    <div className='flex items-center justify-center gap-3 mt-1'>
                                        <X color='red' size={20} />
                                        <Switch
                                            checked={planeState.operational}
                                            onCheckedChange={(checked) => setPlaneState((prev) => ({ ...prev, operational: checked }))}
                                            disabled={loading}
                                            id='operational'
                                        />
                                        <Check color='green' size={20} />
                                    </div>
                                    <span className='text-sm text-gray-500'>
                                        {planeState.operational ? "En fonctionnement" : "En maintenance"}
                                    </span>
                                </div>
                            </div>
                            <div className='grid items-center gap-2'>
                            <DropDownClasse 
                                planeProp={planeState}
                                setPlaneProp={setPlaneState}
                            />
                            </div>
                        </div>
                        {error && (
                            <div className="text-red-500 w-full p-2 bg-[#FFF4F4] rounded-lg flex items-center space-x-2">
                                <IoIosWarning size={20} />
                                <div>{error}</div>
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter>
                        <button onClick={() => setShowPopup(false)} disabled={loading}>Annuler</button>
                        <Button onClick={onClickUpdatePlane} disabled={loading}>
                            {loading ? (
                                <Spinner />
                            ) : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>


    )
}

export default UpdatePlanes
