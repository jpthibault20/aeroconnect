"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { User, userRole } from '@prisma/client';
import { updateUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { signOut } from '@/app/auth/login/action';
import { Spinner } from '../ui/SpinnerVariants';
import InputClasses from '../InputClasses';
import {
    User as UserIcon,
    MapPin,
    Phone,
    Mail,
    LogOut,
    Save,
    ShieldCheck
} from 'lucide-react';

const ProfilePage = () => {
    const [loading, setLoading] = useState(false);
    const { currentUser } = useCurrentUser();
    const [classes, setClasses] = useState<number[]>(currentUser?.classes || []);

    const [profile, setProfile] = useState<User>(() => ({
        ...currentUser!,
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
        adress: currentUser?.adress || '',
        city: currentUser?.city || '',
        zipCode: currentUser?.zipCode || '',
        country: currentUser?.country || '',
        role: currentUser?.role || userRole.USER,
    } as User));

    useEffect(() => {
        setProfile(prev => ({ ...prev, classes }));
    }, [classes]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await updateUser(profile);
            if (res.success) {
                toast({
                    title: "Profil mis à jour",
                    description: "Vos informations ont été enregistrées.",
                    className: "bg-green-600 text-white border-none",
                });
            } else if (res.error) {
                toast({
                    title: "Erreur",
                    description: "Une erreur est survenue lors de la mise à jour.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        signOut();
    };

    const inputClass = "bg-slate-50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE]";
    const labelClass = "text-slate-600 font-medium text-sm flex items-center gap-2";

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-50 p-4 md:p-8 font-sans">

            {/* Titre de page */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mon Profil</h1>
                    <p className="text-slate-500">Gérez vos informations personnelles et préférences.</p>
                </div>
            </div>

            {/* Carte Principale */}
            <div className="w-full bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-200 overflow-hidden mb-10">

                {/* --- HEADER VISUEL --- */}
                <div className="relative bg-slate-50/50 p-8 md:p-10 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row items-center gap-8">

                        {/* --- AVATAR 100% INITIALES / DESIGN PREMIUM --- */}
                        <div className="relative group cursor-default select-none">
                            {/* 1. Halo lumineux derrière (Glow) */}
                            <div className="absolute -inset-2 bg-[#774BBE] rounded-full blur-xl opacity-10 group-hover:opacity-20 transition duration-700"></div>

                            {/* 2. Cercle Principal (Effet Verre Violet) */}
                            <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-full flex items-center justify-center
                                bg-gradient-to-br from-[#774BBE]/90 to-[#502c84]/80 backdrop-blur-md
                                shadow-xl shadow-purple-200/40
                                border-[6px] border-white ring-1 ring-slate-100
                                overflow-hidden">

                                {/* Reflet supérieur (Lumière) */}
                                <div className="absolute -top-10 -left-10 w-full h-full bg-white/20 blur-2xl rotate-45"></div>

                                {/* Reflet inférieur (Profondeur) */}
                                <div className="absolute bottom-0 inset-x-0 h-1/3 bg-black/10 blur-md"></div>

                                {/* Les Initiales : Grosses, Blanches, Nettes */}
                                <span className="relative z-10 text-4xl md:text-5xl font-bold tracking-widest text-white drop-shadow-md" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                                    {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                                </span>
                            </div>

                            {/* 3. Badge de statut (Point Vert) */}
                            <div className="absolute bottom-2 right-2 z-20">
                                <span className="relative flex h-6 w-6">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-6 w-6 bg-green-500 border-[4px] border-white"></span>
                                </span>
                            </div>
                        </div>
                        {/* ------------------------------------------- */}

                        <div className="text-center md:text-left space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                                {profile.firstName} {profile.lastName}
                            </h2>
                            <div className="flex flex-col md:flex-row items-center gap-2 text-sm text-slate-500">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-[#774BBE] border border-purple-100 font-bold text-xs uppercase tracking-wide">
                                    {profile.role}
                                </span>
                                <span className="hidden md:inline text-slate-300 mx-1">•</span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm text-slate-600">
                                    <Mail className="w-3.5 h-3.5 text-[#774BBE]" />
                                    {profile.email}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">

                        {/* Colonne Gauche */}
                        <div className="space-y-8">
                            {/* Section Identité */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <UserIcon className="w-4 h-4 text-[#774BBE]" /> Identité
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName" className={labelClass}>Prénom</Label>
                                        <Input id="firstName" name="firstName" value={profile.firstName || ""} onChange={handleChange} required className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className={labelClass}>Nom</Label>
                                        <Input id="lastName" name="lastName" value={profile.lastName || ""} onChange={handleChange} required className={inputClass} />
                                    </div>
                                </div>
                            </div>

                            {/* Section Contact */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Phone className="w-4 h-4 text-[#774BBE]" /> Contact
                                </h3>
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className={labelClass}>Email</Label>
                                        <Input id="email" name="email" value={profile.email || ""} disabled className="bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-80" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className={labelClass}>Téléphone</Label>
                                        <Input id="phone" name="phone" type="tel" value={profile.phone || ""} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Colonne Droite */}
                        <div className="space-y-8">
                            {/* Section Adresse */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <MapPin className="w-4 h-4 text-[#774BBE]" /> Adresse
                                </h3>
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="adress" className={labelClass}>Rue</Label>
                                        <Input id="adress" name="adress" value={profile.adress || ""} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="zipCode" className={labelClass}>Code Postal</Label>
                                            <Input id="zipCode" name="zipCode" value={profile.zipCode || ""} onChange={handleChange} className={inputClass} />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="city" className={labelClass}>Ville</Label>
                                            <Input id="city" name="city" value={profile.city || ""} onChange={handleChange} className={inputClass} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="country" className={labelClass}>Pays</Label>
                                        <Input id="country" name="country" value={profile.country || ""} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                            </div>

                            {/* Section Qualifications */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <ShieldCheck className="w-4 h-4 text-[#774BBE]" /> Qualifications
                                </h3>
                                <div className="p-6 bg-slate-50/80 rounded-xl border border-slate-200">
                                    <Label className="mb-4 block text-slate-700 font-semibold text-sm">Classes autorisées</Label>
                                    <InputClasses
                                        disabled={loading || (currentUser?.role !== userRole.OWNER && currentUser?.role !== userRole.ADMIN && currentUser?.role !== userRole.MANAGER)}
                                        classes={classes}
                                        setClasses={setClasses}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-50 p-6 md:px-10 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={handleLogout}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto font-medium"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Déconnexion
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:w-auto min-w-[180px] h-11 shadow-lg shadow-purple-100 transition-all active:scale-95 text-base"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Spinner className="text-white w-5 h-5" />
                                    <span>Enregistrement...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-5 h-5" />
                                    <span>Enregistrer les modifications</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;