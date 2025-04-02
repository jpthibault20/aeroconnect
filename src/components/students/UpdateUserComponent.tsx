import React, { useEffect, useState } from 'react'
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
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { Spinner } from '../ui/SpinnerVariants'
import InputClasses from '../InputClasses'
import { ScrollArea } from '../ui/scroll-area'
import { clearCache } from '@/lib/cache'



interface Props {
    children: React.ReactNode
    showPopup: boolean
    setShowPopup: React.Dispatch<React.SetStateAction<boolean>>
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    user: User
}

const UpdateUserComponent = ({ children, showPopup, setShowPopup, setUsers, user }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [autorisedModifyRole, setAutorisedModifyRole] = useState(false);
    const [classes, setClasses] = useState<number[]>(user.classes);
    const [userState, setUserState] = useState<User>(user);

    useEffect(() => {
        if (currentUser?.role === "ADMIN" || currentUser?.role === "OWNER" || currentUser?.role === "INSTRUCTOR") {
            setAutorisedModifyRole(true);
        } else {
            setAutorisedModifyRole(false);
        }
    }, [currentUser]);

    useEffect(() => {
        setUserState({ ...userState, classes })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classes])

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
                    // Met à jour l'utilisateur dans la liste des utilisateurs
                    setUsers((prevUsers) =>
                        prevUsers.map((u) =>
                            u.id === userState.id ? { ...u, ...userState } : u
                        )
                    );

                    setShowPopup(false);
                    setLoading(false);
                    clearCache(`users:${userState.clubID}`)
                    toast({
                        title: "Utilisateur mis à jour avec succès",
                        duration: 5000,
                        style: {
                            background: '#0bab15', //rouge : ab0b0b
                            color: '#fff',
                        }
                    });
                }
                if (res.error) {
                    console.log(res.error);
                    setLoading(false);
                    toast({
                        title: "Oups, une erreur est survenue",
                        duration: 5000,
                        style: {
                            background: '#ab0b0b', //rouge : ab0b0b
                            color: '#fff',
                        }
                    });
                }
            } catch (error) {
                console.log(error);
                setLoading(false);
            }
        };
        updateUserAction();
    };


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
                <ScrollArea className='h-[500px]' type='always'>
                    <div className='space-y-3 max-h-[60vh] md:max-h-none overflow-y-auto md:overflow-visible'>
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
                                disabled={true}
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

                        {/* User can suscribe without plane */}
                        <div className="grid items-center gap-2">
                            <Label htmlFor="restricted">Utilisateur autonome</Label>
                            <div className='flex items-center gap-2 border border-gray-300 rounded-xl p-2'>
                                <p className='text-gray-500'>Cette utilisateur peux s&apos;inscrire sans choisir d&apos;avion</p>
                                <div className='flex items-center gap-2'>
                                    <ImCross color='red' />
                                    <Switch
                                        checked={userState.canSubscribeWithoutPlan}
                                        onCheckedChange={(checked) => onChangeUserState('canSubscribeWithoutPlan', checked)}
                                        disabled={loading || !autorisedModifyRole}
                                    />
                                    <FaCheck color='green' />
                                </div>
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
                                    <SelectTrigger className="w-[150px]" disabled={!autorisedModifyRole}>
                                        <SelectValue placeholder="Rôle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(userRole)
                                            .filter(([key]) => key !== "ADMIN") // Exclure "ADMIN"
                                            .map(([key, value]) => (
                                                <SelectItem key={key} value={value}>
                                                    {key === "USER" && "Visiteur"}
                                                    {key === "STUDENT" && "Elève"}
                                                    {key === "INSTRUCTOR" && "Instructeur"}
                                                    {key === "PILOT" && "Pilote"}
                                                    {key === "MANAGER" && "Manager"}
                                                    {key === "OWNER" && "Président"}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid items-center gap-2">
                                <Label htmlFor="clubID">Identifiant club</Label>
                                <Input
                                    id="clubID"
                                    value={userState.clubID as string}
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 py-2">
                            <InputClasses
                                disabled={loading}
                                classes={classes}
                                setClasses={setClasses}
                            />
                        </div>

                        {/* Restricted*/}
                        <div className="grid items-center gap-2">
                            <Label htmlFor="restricted">Restreindre l&apos;utilisateur</Label>
                            <div className='flex items-center gap-2 border border-gray-300 rounded-xl p-2'>
                                <p className='text-gray-500'>Cette utilisateur restreint ne peut que visualiser les sessions </p>
                                <div className='flex items-center gap-2'>
                                    <ImCross color='red' />
                                    <Switch
                                        checked={userState.restricted}
                                        onCheckedChange={(checked) => onChangeUserState('restricted', checked)}
                                        disabled={loading || !autorisedModifyRole}
                                    />
                                    <FaCheck color='green' />
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea >
                <DialogFooter>
                    <button onClick={() => setShowPopup(false)} disabled={loading}>Annuler</button>
                    <Button onClick={onClickUpdateUser} disabled={loading}>
                        {loading ? (
                            <Spinner />
                        ) : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default UpdateUserComponent
