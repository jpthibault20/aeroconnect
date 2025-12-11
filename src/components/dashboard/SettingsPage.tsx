'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Clock, OctagonMinus, Plane, Plus, Settings, Users, Save, MapPin, Trash2 } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { User } from '@prisma/client'
import { IoIosWarning } from 'react-icons/io'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { z } from 'zod'
import { updateClub } from '@/api/db/club'
import { Spinner } from '../ui/SpinnerVariants'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// --- Schéma Zod (Inchangé pour la logique) ---
const configSchema = z.object({
    clubName: z.string().min(1, "Le nom du club est requis"),
    clubId: z.string().nonempty("L'identifiant du club est requis"),
    address: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    owners: z.array(z.string()).min(1, "Veuillez sélectionner au moins un président"),
    classes: z.array(z.number()).min(1, "Veuillez sélectionner au moins une classe ULM"),
    hourStart: z.string().regex(/^\d{2}:\d{2}$/, "L'heure de début est invalide"),
    hourEnd: z.string().regex(/^\d{2}:\d{2}$/, "L'heure de fin est invalide"),
    totalHours: z.number().optional(),
    timeOfSession: z.number().positive("La durée doit être positive").optional(),
    userCanSubscribe: z.boolean(),
    preSubscribe: z.boolean(),
    timeDelaySubscribeminutes: z.number().optional(),
    userCanUnsubscribe: z.boolean(),
    preUnsubscribe: z.boolean(),
    timeDelayUnsubscribeminutes: z.number().optional(),
    firstNameContact: z.string().min(1, "Le prénom est requis"),
    lastNameContact: z.string().min(1, "Le nom est requis"),
    mailContact: z.string().email("Email invalide"),
    phoneContact: z.string().regex(/^\+?\d{10,15}$/, "Téléphone invalide"),
}).refine((data) => {
    const [startHour, startMinute] = data.hourStart.split(":").map(Number);
    const [endHour, endMinute] = data.hourEnd.split(":").map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    return endTotalMinutes - startTotalMinutes >= 300;
}, {
    message: "L'amplitude doit être d'au moins 5h",
    path: ["totalHours"],
});

const classesULM = ["Paramoteur", "Pendulaire", "Multiaxe", "Autogire", "Aérostat ULM", "Hélicoptère ULM"];

interface Props {
    users: User[],
}

const SettingsPage = ({ users }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();

    // --- State Initialization ---
    const [config, setConfig] = useState({
        clubName: currentClub?.Name || '',
        clubId: currentClub?.id || '',
        address: currentClub?.Address || '',
        city: currentClub?.City || '',
        zipCode: currentClub?.ZipCode || '',
        country: currentClub?.Country || '',
        owners: currentClub?.OwnerId || [],
        classes: currentClub?.classes || [],
        hourStart: currentClub?.HoursOn ? String(currentClub.HoursOn[0]).padStart(2, '0') + ":00" : '00:00',
        hourEnd: currentClub?.HoursOn ? String(currentClub.HoursOn[currentClub.HoursOn.length - 1]).padStart(2, '0') + ":00" : '00:00',
        timeOfSession: currentClub?.SessionDurationMin || 0,
        userCanSubscribe: currentClub?.userCanSubscribe ?? false,
        preSubscribe: currentClub?.preSubscribe ?? false,
        timeDelaySubscribeminutes: currentClub?.timeDelaySubscribeminutes || 0,
        userCanUnsubscribe: currentClub?.userCanUnsubscribe ?? false,
        preUnsubscribe: currentClub?.preUnsubscribe ?? false,
        timeDelayUnsubscribeminutes: currentClub?.timeDelayUnsubscribeminutes || 0,
        firstNameContact: currentClub?.firstNameContact || '',
        lastNameContact: currentClub?.lastNameContact || '',
        mailContact: currentClub?.mailContact || '',
        phoneContact: currentClub?.phoneContact || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    // --- Handlers ---

    const validateConfig = () => {
        const result = configSchema.safeParse(config);
        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.errors.forEach(err => {
                if (err.path[0]) newErrors[err.path[0] as string] = err.message;
            });
            setErrors(newErrors);
            toast({
                title: "Erreur de validation",
                description: "Veuillez vérifier les champs en rouge.",
                variant: "destructive"
            });
            return false;
        }
        setErrors({});
        return true;
    };

    const handleSubmit = async () => {
        if (validateConfig()) {
            try {
                setLoading(true);
                const result = await updateClub(currentClub?.id as string, config)
                if (result.error) {
                    toast({ title: "Erreur", description: result.error, variant: "destructive" });
                } else {
                    toast({
                        title: "Succès",
                        description: "Paramètres du club mis à jour.",
                        className: "bg-green-600 text-white border-none"
                    });
                }
            } catch (error) {
                console.error(error);
                toast({ title: "Erreur technique", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleClassesChoice = (classesNumber: number) => {
        if (config.classes.includes(classesNumber)) {
            setConfig(prev => ({ ...prev, classes: prev.classes.filter(c => c !== classesNumber) }))
        } else {
            setConfig(prev => ({ ...prev, classes: [...prev.classes, classesNumber] }))
        }
    };

    // --- Styles Helpers ---
    const inputStyle = "bg-slate-50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE]";
    const cardStyle = "border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden";
    const sectionTitleStyle = "text-lg font-semibold text-slate-800 flex items-center gap-2";
    const iconBoxStyle = "p-2 bg-purple-50 text-[#774BBE] rounded-lg";

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32 font-sans">

            {/* --- Header Page --- */}
            <div className="max-w-4xl mx-auto mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Paramètres du Club</h1>
                <p className="text-slate-500">Configurez les informations générales, les accès et les règles de réservation.</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">

                {/* 1. CONFIGURATION GÉNÉRALE */}
                <Card className={cardStyle}>
                    <CardHeader className="bg-white pb-4 border-b border-slate-100">
                        <CardTitle className={sectionTitleStyle}>
                            <div className={iconBoxStyle}><Settings className="w-5 h-5" /></div>
                            Informations Générales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Identité Club */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="nomClub">Nom du Club</Label>
                                <Input
                                    id="nomClub"
                                    value={config.clubName}
                                    onChange={(e) => setConfig(prev => ({ ...prev, clubName: e.target.value }))}
                                    className={inputStyle}
                                />
                                {errors.clubName && <p className="text-xs text-red-500 flex items-center gap-1"><IoIosWarning /> {errors.clubName}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clubId">Identifiant (Lecture seule)</Label>
                                <Input id="clubId" value={config.clubId} disabled className="bg-slate-100 text-slate-500" />
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* Contact Principal */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Contact Principal</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="space-y-2">
                                    <Label>Prénom</Label>
                                    <Input value={config.firstNameContact} onChange={(e) => setConfig(prev => ({ ...prev, firstNameContact: e.target.value }))} className={inputStyle} />
                                    {errors.firstNameContact && <p className="text-xs text-red-500">{errors.firstNameContact}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Nom</Label>
                                    <Input value={config.lastNameContact} onChange={(e) => setConfig(prev => ({ ...prev, lastNameContact: e.target.value }))} className={inputStyle} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={config.mailContact} onChange={(e) => setConfig(prev => ({ ...prev, mailContact: e.target.value }))} className={inputStyle} />
                                    {errors.mailContact && <p className="text-xs text-red-500">{errors.mailContact}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Téléphone</Label>
                                    <Input type="tel" value={config.phoneContact} onChange={(e) => setConfig(prev => ({ ...prev, phoneContact: e.target.value }))} className={inputStyle} />
                                    {errors.phoneContact && <p className="text-xs text-red-500">{errors.phoneContact}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        {/* Adresse */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Localisation
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Adresse</Label>
                                    <Textarea value={config.address} onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))} className={inputStyle} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Ville</Label>
                                        <Input value={config.city} onChange={(e) => setConfig(prev => ({ ...prev, city: e.target.value }))} className={inputStyle} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Code Postal</Label>
                                        <Input value={config.zipCode} onChange={(e) => setConfig(prev => ({ ...prev, zipCode: e.target.value }))} className={inputStyle} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pays</Label>
                                    <Input value={config.country} onChange={(e) => setConfig(prev => ({ ...prev, country: e.target.value }))} className={inputStyle} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. HORAIRES & SESSIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Horaires */}
                    <Card className={cn(cardStyle, "flex flex-col")}>
                        <CardHeader className="bg-white border-b border-slate-100">
                            <CardTitle className={sectionTitleStyle}>
                                <div className={iconBoxStyle}><Clock className="w-5 h-5" /></div>
                                Horaires d&apos;ouverture
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 flex-1 flex flex-col justify-center gap-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Ouverture</Label>
                                    <Select value={config.hourStart} onValueChange={(v) => setConfig(prev => ({ ...prev, hourStart: v }))}>
                                        <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`).map(h => (
                                                <SelectItem key={h} value={h}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Fermeture</Label>
                                    <Select value={config.hourEnd} onValueChange={(v) => setConfig(prev => ({ ...prev, hourEnd: v }))}>
                                        <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`).map(h => (
                                                <SelectItem key={h} value={h}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {errors.totalHours && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{errors.totalHours}</p>}
                        </CardContent>
                    </Card>

                    {/* Classes ULM */}
                    <Card className={cn(cardStyle, "flex flex-col")}>
                        <CardHeader className="bg-white border-b border-slate-100">
                            <CardTitle className={sectionTitleStyle}>
                                <div className={iconBoxStyle}><Plane className="w-5 h-5" /></div>
                                Flotte ULM
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-3">
                                {classesULM.map((classe, index) => {
                                    const isSelected = config.classes.includes(index + 1);
                                    return (
                                        <div
                                            key={classe}
                                            onClick={() => handleClassesChoice(index + 1)}
                                            className={cn(
                                                "cursor-pointer border rounded-lg p-3 text-sm font-medium transition-all flex items-center justify-between",
                                                isSelected ? "bg-purple-50 border-[#774BBE] text-[#774BBE]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {classe}
                                            {isSelected && <div className="h-2 w-2 rounded-full bg-[#774BBE]" />}
                                        </div>
                                    )
                                })}
                            </div>
                            {errors.classes && <p className="text-xs text-red-500 mt-2">{errors.classes}</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* 3. RÈGLES DE RÉSERVATION (SESSIONS) */}
                <Card className={cardStyle}>
                    <CardHeader className="bg-white border-b border-slate-100">
                        <CardTitle className={sectionTitleStyle}>
                            <div className={iconBoxStyle}><OctagonMinus className="w-5 h-5" /></div>
                            Règles de Réservation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">

                        {/* Durée */}
                        <div className="space-y-2">
                            <Label>Durée standard d&apos;une session (minutes)</Label>
                            <Input
                                type="number"
                                value={config.timeOfSession}
                                className={cn(inputStyle, "max-w-[200px]")}
                                onChange={(e) => setConfig(prev => ({ ...prev, timeOfSession: Number(e.target.value) }))}
                            />
                        </div>

                        {/* Inscription */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                                <div>
                                    <Label className="text-base">Autoriser l&apos;inscription élève</Label>
                                    <p className="text-xs text-slate-500">Les élèves peuvent s&apos;inscrire eux-mêmes aux sessions.</p>
                                </div>
                                <Switch checked={config.userCanSubscribe} onCheckedChange={(c) => setConfig(prev => ({ ...prev, userCanSubscribe: c }))} />
                            </div>

                            {config.userCanSubscribe && (
                                <div className="ml-4 pl-4 border-l-2 border-purple-100 space-y-4 animate-in slide-in-from-left-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Activer la pré-inscription</Label>
                                        <Switch disabled checked={config.preSubscribe} onCheckedChange={(c) => setConfig(prev => ({ ...prev, preSubscribe: c }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Délai min. avant inscription (minutes)</Label>
                                        <Input
                                            value={config.timeDelaySubscribeminutes}
                                            onChange={(e) => {
                                                if (/^\d*$/.test(e.target.value)) setConfig(prev => ({ ...prev, timeDelaySubscribeminutes: Number(e.target.value) }))
                                            }}
                                            className={cn(inputStyle, "max-w-[200px]")}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Désinscription */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                                <div>
                                    <Label className="text-base">Autoriser la désinscription</Label>
                                    <p className="text-xs text-slate-500">Les élèves peuvent annuler eux-mêmes.</p>
                                </div>
                                <Switch checked={config.userCanUnsubscribe} onCheckedChange={(c) => setConfig(prev => ({ ...prev, userCanUnsubscribe: c }))} />
                            </div>

                            {config.userCanUnsubscribe && (
                                <div className="ml-4 pl-4 border-l-2 border-purple-100 space-y-4 animate-in slide-in-from-left-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Activer la pré-désinscription</Label>
                                        <Switch disabled checked={config.preUnsubscribe} onCheckedChange={(c) => setConfig(prev => ({ ...prev, preUnsubscribe: c }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Délai min. avant annulation (minutes)</Label>
                                        <Input
                                            value={config.timeDelayUnsubscribeminutes}
                                            onChange={(e) => {
                                                if (/^\d*$/.test(e.target.value)) setConfig(prev => ({ ...prev, timeDelayUnsubscribeminutes: Number(e.target.value) }))
                                            }}
                                            className={cn(inputStyle, "max-w-[200px]")}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. PRÉSIDENTS */}
                <Card className={cardStyle}>
                    <CardHeader className="bg-white border-b border-slate-100">
                        <CardTitle className={sectionTitleStyle}>
                            <div className={iconBoxStyle}><Users className="w-5 h-5" /></div>
                            Présidence
                        </CardTitle>
                        <CardDescription>Gérez les membres ayant les droits de Président.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {config.owners.map((owner, index) => {
                            const selectedUser = users.find((user) => user.id === owner);
                            return (
                                <div key={index} className="flex gap-2">
                                    <Select
                                        value={owner}
                                        onValueChange={(val) => {
                                            const newOwners = [...config.owners];
                                            newOwners[index] = val;
                                            setConfig(prev => ({ ...prev, owners: newOwners }));
                                        }}
                                        disabled={config.owners.includes(currentUser?.id as string)}
                                    >
                                        <SelectTrigger className={inputStyle}>
                                            <SelectValue placeholder="Sélectionnez un membre">
                                                {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "Sélectionner un membre"}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.filter(u => u.role !== 'ADMIN').map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            const newOwners = config.owners.filter((_, i) => i !== index);
                                            setConfig(prev => ({ ...prev, owners: newOwners }));
                                        }}
                                        disabled={currentUser?.id === owner}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 border-slate-200"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            );
                        })}
                        <Button
                            variant="outline"
                            onClick={() => setConfig(prev => ({ ...prev, owners: [...prev.owners, ""] }))}
                            className="w-full border-dashed border-slate-300 text-slate-500 hover:text-[#774BBE] hover:border-[#774BBE] hover:bg-purple-50"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter un président
                        </Button>
                    </CardContent>
                </Card>

            </div>

            {/* --- Sticky Bottom Bar (Mobile & Desktop) --- */}
            {/* Cette barre reste fixée en bas de l'écran pour que l'action soit toujours visible */}
            {/* CHANGEMENTS DESIGN :
                1. 'relative' sur mobile : La barre est à la fin du flux (pas de conflit avec ton bouton menu).
                2. 'lg:sticky lg:bottom-0' : Sur PC, la barre reste en bas mais respecte la largeur du contenu (ne couvre pas la sidebar).
                3. 'mt-8' : Ajoute un peu d'espace avant la barre sur mobile.
            */}
            <div className="relative mt-8 lg:sticky bottom-0 z-40 w-full bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 md:px-8 flex justify-center md:justify-end">
                <div className="w-full max-w-4xl flex justify-end">
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full md:w-auto bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-lg transition-transform active:scale-95"
                    >
                        {loading ? <Spinner className="text-white w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {loading ? "Enregistrement..." : "Enregistrer la configuration"}
                    </Button>
                </div>
            </div>

        </div>
    )
}

export default SettingsPage