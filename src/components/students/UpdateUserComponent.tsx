import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select';
import { User, userRole } from '@prisma/client';
import { updateUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Spinner } from '../ui/SpinnerVariants';
import InputClasses from '../InputClasses';
import { clearCache } from '@/lib/cache';
import { UserCog, Ban, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IoIosWarning } from 'react-icons/io';

interface Props {
    children: React.ReactNode;
    showPopup: boolean;
    setShowPopup: React.Dispatch<React.SetStateAction<boolean>>;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    user: User;
}

const UpdateUserComponent = ({ children, showPopup, setShowPopup, setUsers, user }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [autorisedModifyRole, setAutorisedModifyRole] = useState(false);
    const [classes, setClasses] = useState<number[]>(user.classes);
    const [userState, setUserState] = useState<User>(user);

    // Vérification des droits
    useEffect(() => {
        const canModify = ["ADMIN", "OWNER", "INSTRUCTOR", "MANAGER"].includes(currentUser?.role || "");
        setAutorisedModifyRole(canModify);
    }, [currentUser]);

    // Synchro des classes
    useEffect(() => {
        setUserState(prev => ({ ...prev, classes }));
    }, [classes]);

    const onChangeUserState = (key: keyof typeof userState, value: string | boolean) => {
        setUserState((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const onClickUpdateUser = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await updateUser(userState);
            if (res.success) {
                // Update local state
                setUsers((prevUsers) =>
                    prevUsers.map((u) =>
                        u.id === userState.id ? { ...u, ...userState } : u
                    )
                );
                clearCache(`users:${userState.clubID}`);
                toast({
                    title: "Profil mis à jour",
                    description: `${userState.firstName} ${userState.lastName} a été modifié avec succès.`,
                    className: "bg-green-600 text-white border-none"
                });
                setShowPopup(false);
            } else {
                setError(res.error || "Une erreur est survenue.");
            }
        } catch (error) {
            console.error(error);
            setError("Erreur technique lors de la sauvegarde.");
        } finally {
            setLoading(false);
        }
    };

    // Helper styles
    const inputStyle = "bg-slate-50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE]";
    const labelStyle = "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block";

    return (
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            <DialogContent className="w-[95%] sm:max-w-[600px] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

                {/* --- Header --- */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-purple-100 text-[#774BBE] rounded-lg">
                                <UserCog className="w-5 h-5" />
                            </div>
                            Modifier le membre
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11">
                            Édition du profil et des permissions d&apos;accès.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* --- Content Scrollable --- */}
                <div className='p-6 space-y-8 overflow-y-auto'>

                    {/* 1. Identité */}
                    <div>
                        <span className={labelStyle}>Identité & Contact</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="lastName">Nom</Label>
                                <Input id="lastName" value={userState.lastName} onChange={(e) => onChangeUserState('lastName', e.target.value)} disabled={loading} className={inputStyle} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="firstName">Prénom</Label>
                                <Input id="firstName" value={userState.firstName} onChange={(e) => onChangeUserState('firstName', e.target.value)} disabled={loading} className={inputStyle} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={userState.email} disabled className="bg-slate-100 text-slate-500" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone">Téléphone</Label>
                                <Input id="phone" value={userState.phone || ''} onChange={(e) => onChangeUserState('phone', e.target.value)} disabled={loading} className={inputStyle} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 2. Adresse (Pliable ou simplifié) */}
                    <div>
                        <span className={labelStyle}>Adresse</span>
                        <div className="space-y-3">
                            <Input placeholder="Rue..." value={userState.adress || ''} onChange={(e) => onChangeUserState('adress', e.target.value)} disabled={loading} className={inputStyle} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Ville" value={userState.city || ''} onChange={(e) => onChangeUserState('city', e.target.value)} disabled={loading} className={inputStyle} />
                                <Input placeholder="Code Postal" value={userState.zipCode || ''} onChange={(e) => onChangeUserState('zipCode', e.target.value)} disabled={loading} className={inputStyle} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* 3. Administration (Visible seulement pour Admin/Owner) */}
                    <div>
                        <span className={labelStyle}>Administration</span>
                        <div className="space-y-4">

                            {/* Role Select */}
                            <div className="space-y-1.5">
                                <Label>Rôle dans le club</Label>
                                <Select
                                    value={userState.role}
                                    onValueChange={(val: userRole) => onChangeUserState('role', val)}
                                    disabled={loading || !autorisedModifyRole}
                                >
                                    <SelectTrigger className={inputStyle}>
                                        <SelectValue placeholder="Sélectionner un rôle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">Visiteur</SelectItem>
                                        <SelectItem value="STUDENT">Élève</SelectItem>
                                        <SelectItem value="PILOT">Pilote</SelectItem>
                                        <SelectItem value="INSTRUCTOR">Instructeur</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                        <SelectItem value="OWNER">Président</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Switches Design "Carte" */}
                            <div className="grid grid-cols-1 gap-3">

                                {/* Restricted Switch */}
                                <div className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                    userState.restricted ? "bg-red-50 border-red-100" : "bg-white border-slate-200"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-full", userState.restricted ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500")}>
                                            <Ban className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium text-slate-900">Accès Restreint</p>
                                            <p className="text-xs text-slate-500">Lecture seule uniquement</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={userState.restricted}
                                        onCheckedChange={(c) => onChangeUserState('restricted', c)}
                                        disabled={loading || !autorisedModifyRole}
                                        className="data-[state=checked]:bg-red-500"
                                    />
                                </div>

                                {/* Autonome Switch */}
                                <div className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                    userState.canSubscribeWithoutPlan ? "bg-blue-50 border-blue-100" : "bg-white border-slate-200"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-full", userState.canSubscribeWithoutPlan ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
                                            <Plane className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium text-slate-900">Utilisateur Autonome</p>
                                            <p className="text-xs text-slate-500">Peut réserver sans instructeur</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={userState.canSubscribeWithoutPlan}
                                        onCheckedChange={(c) => onChangeUserState('canSubscribeWithoutPlan', c)}
                                        disabled={loading || !autorisedModifyRole}
                                        className="data-[state=checked]:bg-blue-600"
                                    />
                                </div>
                            </div>

                            {/* Classes */}
                            <div className="pt-2">
                                <Label className="mb-2 block">Qualifications</Label>
                                <InputClasses
                                    disabled={loading || !autorisedModifyRole}
                                    classes={classes}
                                    setClasses={setClasses}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Footer --- */}
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
                            onClick={onClickUpdateUser}
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
    );
};

export default UpdateUserComponent;