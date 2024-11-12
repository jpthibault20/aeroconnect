import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { User, userRole } from '@prisma/client'
import { updateUser } from '@/api/db/users'
import { toast } from '@/hooks/use-toast'
import { Switch } from '../ui/switch'
import { FaCheck } from "react-icons/fa";
import { ImCross } from "react-icons/im";



interface Props {
    children: React.ReactNode
    showPopup: boolean
    setShowPopup: React.Dispatch<React.SetStateAction<boolean>>
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    user: User
}

const UpdateUserComponent = ({ children, showPopup, setShowPopup, reload, setReload, user }: Props) => {
    const [loading, setLoading] = useState(false);
    const [userState, setUserState] = useState<User>({
        id: user.id || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || null,
        adress: user.adress || null,
        city: user.city || null,
        zipCode: user.zipCode || null,
        role: user.role || userRole.USER,
        clubID: user.clubID || '',
        restricted: user.restricted || false,
        country: user.country || null,
    })

    const onChangeUserState = (key: keyof typeof userState, value: string | boolean) => {
        setUserState((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const onClickUpdateUser = () => {
        const updateUserAction = async () => {
            setLoading(true);
            try {
                const res = await updateUser(userState);
                if (res.success) {
                    setShowPopup(false);
                    setLoading(false);
                    setReload(!reload);
                    toast({
                        title: "Utilisateur mis à jour avec succès",
                    });

                }
                if (res.error) {
                    console.log(res.error);
                    setLoading(false);
                    setReload(!reload);
                    toast({
                        title: " Oups, une erreur est survenue",
                    });
                }
            } catch (error) {
                console.log(error);
            }
        }
        updateUserAction();
    }

    return (
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mise à jour du profil</DialogTitle>
                    <DialogDescription>
                        Modifiez les informations du profil de l&apos;utilisateur
                    </DialogDescription>
                </DialogHeader>

                {/* Nom et Prénom */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="firstName">Nom</Label>
                        <Input
                            id="firstName"
                            value={userState.firstName}
                            disabled={loading}
                            onChange={(e) => onChangeUserState('firstName', e.target.value)}
                        />
                    </div>
                    <div className="grid items-center gap-2">
                        <Label htmlFor="lastName">Prénom</Label>
                        <Input
                            id="lastName"
                            value={userState.lastName || ''}
                            disabled={loading}
                            onChange={(e) => onChangeUserState('lastName', e.target.value)}
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="grid items-center gap-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <Input
                        id="email"
                        value={userState.email}
                        disabled={loading}
                        onChange={(e) => onChangeUserState('email', e.target.value)}
                    />
                </div>

                {/* Téléphone */}
                <div className="grid items-center gap-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                        id="phone"
                        value={userState.phone || ''}
                        disabled={loading}
                        onChange={(e) => onChangeUserState('phone', e.target.value)}
                    />
                </div>

                {/* Adresse */}
                <div className="grid items-center gap-2">
                    <Label htmlFor="adress">Adresse</Label>
                    <Input
                        id="adress"
                        value={userState.adress || ''}
                        disabled={loading}
                        onChange={(e) => onChangeUserState('adress', e.target.value)}
                    />
                </div>

                {/* Ville et Code Postal */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                            id="city"
                            value={userState.city || ''}
                            disabled={loading}
                            onChange={(e) => onChangeUserState('city', e.target.value)}
                        />
                    </div>
                    <div className="grid items-center gap-2">
                        <Label htmlFor="zipcode">Code postal</Label>
                        <Input
                            id="zipcode"
                            value={userState.zipCode || ''}
                            disabled={loading}
                            onChange={(e) => onChangeUserState('zipCode', e.target.value)}
                        />
                    </div>
                </div>

                {/* Rôle et clubID */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="grid items-center gap-2">
                        <Label htmlFor="role">Rôle</Label>
                        <Select
                            value={userState.role}
                            disabled={loading}
                            onValueChange={(val: userRole) => onChangeUserState('role', val)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Rôle" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(userRole).map(([key, value]) => (
                                    <SelectItem key={key} value={value}>
                                        {key === "USER" && "Visiteur"}
                                        {key === "STUDENT" && "Elève"}
                                        {key === "INSTRUCTOR" && "Instructeur"}
                                        {key === "PILOT" && "Pilote"}
                                        {key === "OWNER" && "Gérant"}
                                        {key === "ADMIN" && "Administrateur"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid items-center gap-2">
                        <Label htmlFor="clubID">Identifiant club</Label>
                        <Input
                            id="clubID"
                            value={userState.clubID}
                            disabled
                        />
                    </div>
                </div>

                {/* Restricted*/}
                <div className="grid items-center gap-2">
                    <Label htmlFor="restricted">Restreindre l&apos;utilisateur</Label>
                    <div className='flex items-center gap-2 border border-gray-300 rounded-xl p-2'>
                        <p className='text-gray-500'>Un utilisateur restreint ne peut que visualiser les sessions </p>
                        <div className='flex items-center gap-2'>
                            <ImCross color='red' />
                            <Switch
                                checked={userState.restricted}
                                onCheckedChange={(checked) => onChangeUserState('restricted', checked)}
                            />
                            <FaCheck color='green' />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <button onClick={() => setShowPopup(false)} disabled={loading}>Annuler</button>
                    <Button onClick={onClickUpdateUser} disabled={loading}>
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default UpdateUserComponent
