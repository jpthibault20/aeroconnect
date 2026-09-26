'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, Clock, LinkIcon, OctagonMinus, Plane, Plus, Settings, Users, Save, MapPin, Trash2, Wallet } from 'lucide-react'
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
import { getPlanes } from '@/api/db/planes'
import { centsToInput, parseEurosToCents } from '@/lib/wallet'
import { isPrivatePlane } from '@/lib/planeVisibility'
import { emitWalletChanged } from '@/lib/walletEvents'
import WalletConfirmDialog from '../wallet/WalletConfirmDialog'
import PublicBookingLink from './PublicBookingLink'

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

// --- Sections (AER-68) : accordéon sur téléphone, menu latéral sur ordinateur ---
type SectionId = 'infos' | 'horaires' | 'flotte' | 'regles' | 'paiement' | 'presidence' | 'bapteme';

// Champs en erreur -> section à ouvrir pour les montrer.
const SECTION_FIELDS: Record<SectionId, string[]> = {
    infos: ['clubName', 'clubId', 'firstNameContact', 'lastNameContact', 'mailContact', 'phoneContact'],
    horaires: ['hourStart', 'hourEnd', 'totalHours'],
    flotte: ['classes'],
    regles: ['timeOfSession'],
    paiement: ['instructorRate'],
    presidence: ['owners'],
    bapteme: [],
};

const SECTION_ORDER: SectionId[] = ['infos', 'horaires', 'flotte', 'regles', 'paiement', 'presidence', 'bapteme'];

const firstSectionWithError = (errors: Record<string, string>): SectionId | null =>
    SECTION_ORDER.find((id) => SECTION_FIELDS[id].some((field) => errors[field])) ?? null;

interface Props {
    users: User[],
    clubID: string,
    publicToken: string | null,
    onTokenChange: (token: string) => void,
}

const SettingsPage = ({ users, clubID, publicToken, onTokenChange }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub, setCurrentClub } = useCurrentClub();

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
    // Section dépliée (téléphone) / affichée (ordinateur, première par défaut).
    const [openSection, setOpenSection] = useState<SectionId | null>(null);

    // --- Portefeuille élève (AER-66) ---
    const [walletEnabled, setWalletEnabled] = useState<boolean>(currentClub?.walletEnabled ?? false);
    const [instructorRate, setInstructorRate] = useState<string>(centsToInput(currentClub?.instructorHourlyRateCents));
    const [walletConfirm, setWalletConfirm] = useState<"enable" | "disable" | null>(null);
    const [planesWithoutRate, setPlanesWithoutRate] = useState<{ id: string; name: string; immatriculation: string }[]>([]);

    // Modifications non enregistrées : comparaison avec le dernier état enregistré.
    const snapshot = JSON.stringify({ config, walletEnabled, instructorRate });
    const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
    const isDirty = snapshot !== savedSnapshot;

    // Machines d'école du club sans tarif : la signature de leurs vols serait bloquée.
    useEffect(() => {
        if (!walletEnabled || !currentClub?.id) return;
        getPlanes(currentClub.id).then((res) => {
            if (!Array.isArray(res)) return;
            setPlanesWithoutRate(res
                .filter((p) => !isPrivatePlane(p) && p.usageTypes.includes('INSTRUCTION') && p.instructionHourlyRateCents == null)
                .map((p) => ({ id: p.id, name: p.name, immatriculation: p.immatriculation })));
        }).catch(() => { });
    }, [walletEnabled, currentClub?.id]);

    // --- Handlers ---

    const showErrors = (newErrors: Record<string, string>) => {
        setErrors(newErrors);
        const section = firstSectionWithError(newErrors);
        if (section) setOpenSection(section);
        toast({
            title: "Erreur de validation",
            description: "Veuillez vérifier les champs en rouge.",
            variant: "destructive"
        });
    };

    const validateConfig = () => {
        const result = configSchema.safeParse(config);
        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.errors.forEach(err => {
                if (err.path[0]) newErrors[err.path[0] as string] = err.message;
            });
            showErrors(newErrors);
            return false;
        }
        setErrors({});
        return true;
    };

    const handleSubmit = async () => {
        const rateCents = instructorRate.trim() === '' ? null : parseEurosToCents(instructorRate);
        if (instructorRate.trim() !== '' && rateCents == null) {
            showErrors({ ...errors, instructorRate: "Saisissez un tarif valide (ex. : 35 ou 35,50)." });
            return;
        }
        if (validateConfig()) {
            try {
                setLoading(true);
                const result = await updateClub(currentClub?.id as string, {
                    ...config,
                    walletEnabled,
                    instructorHourlyRateCents: rateCents,
                })
                if (result.error) {
                    toast({ title: "Erreur", description: result.error, variant: "destructive" });
                } else {
                    // Le menu, le calendrier… lisent walletEnabled dans le contexte club.
                    setCurrentClub(prev => prev ? { ...prev, walletEnabled, instructorHourlyRateCents: rateCents } : prev);
                    emitWalletChanged();
                    setSavedSnapshot(snapshot);
                    toast({
                        title: "Succès",
                        description: "Paramètres du club mis à jour.",
                        className: "bg-green-600 text-white border-none"
                    });
                }
            } catch {
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
    const subTitleStyle = "text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4";

    // --- Contenu des sections ---

    const infosContent = (
        <div className="space-y-6">
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

            <div>
                <h3 className={subTitleStyle}>Contact Principal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div className="space-y-2">
                        <Label>Prénom</Label>
                        <Input value={config.firstNameContact} onChange={(e) => setConfig(prev => ({ ...prev, firstNameContact: e.target.value }))} className={inputStyle} />
                        {errors.firstNameContact && <p className="text-xs text-red-500">{errors.firstNameContact}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input value={config.lastNameContact} onChange={(e) => setConfig(prev => ({ ...prev, lastNameContact: e.target.value }))} className={inputStyle} />
                        {errors.lastNameContact && <p className="text-xs text-red-500">{errors.lastNameContact}</p>}
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

            <div>
                <h3 className={cn(subTitleStyle, "flex items-center gap-2")}>
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
        </div>
    );

    const hoursOptions = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
    const horairesContent = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="space-y-2">
                    <Label>Ouverture</Label>
                    <Select value={config.hourStart} onValueChange={(v) => setConfig(prev => ({ ...prev, hourStart: v }))}>
                        <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Fermeture</Label>
                    <Select value={config.hourEnd} onValueChange={(v) => setConfig(prev => ({ ...prev, hourEnd: v }))}>
                        <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {errors.totalHours && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{errors.totalHours}</p>}
        </div>
    );

    const flotteContent = (
        <div>
            <div className="grid grid-cols-2 gap-3 max-w-lg">
                {classesULM.map((classe, index) => {
                    const isSelected = config.classes.includes(index + 1);
                    return (
                        <button
                            key={classe}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleClassesChoice(index + 1)}
                            className={cn(
                                "min-h-11 border rounded-lg p-3 text-sm font-medium transition-all flex items-center justify-between text-left",
                                isSelected ? "bg-purple-50 border-[#774BBE] text-[#774BBE]" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {classe}
                            {isSelected && <span className="h-2 w-2 rounded-full bg-[#774BBE]" />}
                        </button>
                    )
                })}
            </div>
            {errors.classes && <p className="text-xs text-red-500 mt-2">{errors.classes}</p>}
        </div>
    );

    const reglesContent = (
        <div className="space-y-8">
            <div className="space-y-2">
                <Label>Durée standard d&apos;une session (minutes)</Label>
                <Input
                    type="number"
                    value={config.timeOfSession}
                    className={cn(inputStyle, "max-w-[200px]")}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeOfSession: Number(e.target.value) }))}
                />
                {errors.timeOfSession && <p className="text-xs text-red-500">{errors.timeOfSession}</p>}
            </div>

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
        </div>
    );

    const paiementContent = (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                <div>
                    <Label className="text-base">Activer le portefeuille élève</Label>
                    <p className="text-xs text-slate-500">
                        Débite automatiquement les vols d&apos;instruction signés et bloque l&apos;inscription des élèves et pilotes dont le solde est nul ou négatif.
                    </p>
                </div>
                <Switch
                    checked={walletEnabled}
                    onCheckedChange={(c) => setWalletConfirm(c ? "enable" : "disable")}
                />
            </div>

            {walletEnabled && (
                <div className="ml-4 pl-4 border-l-2 border-purple-100 space-y-4 animate-in slide-in-from-left-2">
                    <div className="space-y-2">
                        <Label htmlFor="instructorRate">Tarif horaire instructeur (€/h)</Label>
                        <Input
                            id="instructorRate"
                            inputMode="decimal"
                            placeholder="Ex. : 35,00"
                            value={instructorRate}
                            onChange={(e) => {
                                setInstructorRate(e.target.value);
                                setErrors(prev => ({ ...prev, instructorRate: "" }));
                            }}
                            className={cn(inputStyle, "max-w-[200px] font-mono")}
                        />
                        {errors.instructorRate && <p className="text-xs text-red-500">{errors.instructorRate}</p>}
                        <p className="text-xs text-slate-500">
                            Appliqué aux vols d&apos;instruction sur une machine privée : l&apos;élève ne paie que l&apos;instructeur.
                            Sur une machine du club, le tarif écolage de la machine inclut déjà l&apos;instructeur.
                        </p>
                    </div>

                    {planesWithoutRate.length > 0 && (
                        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold">
                                    {planesWithoutRate.length} machine{planesWithoutRate.length > 1 ? "s" : ""} d&apos;école sans tarif :{" "}
                                    {planesWithoutRate.map((p) => `${p.name} (${p.immatriculation})`).join(", ")}.
                                </p>
                                <p>La signature des vols sur ces machines sera bloquée.</p>
                                <Link href={`/planes?clubID=${currentClub?.id}`} className="font-semibold underline underline-offset-2">
                                    Renseigner les tarifs →
                                </Link>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-slate-400">Pensez à enregistrer la configuration pour appliquer ces changements.</p>
                </div>
            )}
        </div>
    );

    const presidenceContent = (
        <div className="space-y-4">
            <p className="text-sm text-slate-500">Gérez les membres ayant les droits de Président.</p>
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
                            aria-label="Retirer ce président"
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
            {errors.owners && <p className="text-xs text-red-500">{errors.owners}</p>}
            <Button
                variant="outline"
                onClick={() => setConfig(prev => ({ ...prev, owners: [...prev.owners, ""] }))}
                className="w-full border-dashed border-slate-300 text-slate-500 hover:text-[#774BBE] hover:border-[#774BBE] hover:bg-purple-50"
            >
                <Plus className="mr-2 h-4 w-4" /> Ajouter un président
            </Button>
        </div>
    );

    const baptemeContent = (
        <div className="space-y-3">
            <PublicBookingLink clubID={clubID} initialToken={publicToken} embedded onTokenChange={onTokenChange} />
            <p className="text-xs text-slate-500">
                Actions immédiates, indépendantes du bouton « Enregistrer la configuration ».
            </p>
        </div>
    );

    const ownersCount = config.owners.filter(Boolean).length;
    const sections: { id: SectionId; title: string; icon: React.ElementType; summary: string; content: React.ReactNode }[] = [
        {
            id: 'infos', title: 'Informations générales', icon: Settings, content: infosContent,
            summary: [config.clubName, config.city].filter(Boolean).join(' · ') || 'Nom, contact, localisation',
        },
        { id: 'horaires', title: "Horaires d'ouverture", icon: Clock, content: horairesContent, summary: `${config.hourStart} – ${config.hourEnd}` },
        {
            id: 'flotte', title: 'Flotte ULM', icon: Plane, content: flotteContent,
            summary: `${config.classes.length} classe${config.classes.length > 1 ? 's' : ''} active${config.classes.length > 1 ? 's' : ''}`,
        },
        {
            id: 'regles', title: 'Règles de réservation', icon: OctagonMinus, content: reglesContent,
            summary: `Session ${config.timeOfSession} min · inscription élève ${config.userCanSubscribe ? 'activée' : 'désactivée'}`,
        },
        {
            id: 'paiement', title: 'Paiement des vols', icon: Wallet, content: paiementContent,
            summary: walletEnabled
                ? ['Portefeuille activé', instructorRate && `${instructorRate} €/h`, planesWithoutRate.length > 0 && `${planesWithoutRate.length} alerte${planesWithoutRate.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ')
                : 'Portefeuille désactivé',
        },
        { id: 'presidence', title: 'Présidence', icon: Users, content: presidenceContent, summary: `${ownersCount} président${ownersCount > 1 ? 's' : ''}` },
        { id: 'bapteme', title: 'Lien baptême & QR code', icon: LinkIcon, content: baptemeContent, summary: publicToken ? 'Lien actif · QR code, PDF' : 'Aucun lien actif' },
    ];

    const desktopSection = openSection ?? 'infos';
    const hasError = (id: SectionId) => SECTION_FIELDS[id].some((field) => errors[field]);

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">

            {/* Menu des sections (ordinateur) */}
            <nav aria-label="Sections des paramètres" className="hidden lg:sticky lg:top-40 lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col lg:gap-1">
                {sections.map((s) => {
                    const active = s.id === desktopSection;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setOpenSection(s.id)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                "flex min-h-11 flex-col rounded-xl px-3 py-2 text-left transition-colors",
                                active ? "bg-purple-50" : "hover:bg-slate-100"
                            )}
                        >
                            <span className={cn("flex items-center gap-2 text-sm", active ? "font-bold text-[#5b3799]" : "font-medium text-slate-700")}>
                                {s.title}
                                {hasError(s.id) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Champs en erreur" />}
                            </span>
                            <span className="truncate text-xs text-slate-500">{s.summary}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
                {sections.map((s) => {
                    const open = s.id === openSection;
                    const Icon = s.icon;
                    return (
                        <section
                            key={s.id}
                            className={cn(
                                "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
                                s.id !== desktopSection && "lg:hidden"
                            )}
                        >
                            {/* En-tête repliable (téléphone) */}
                            <button
                                type="button"
                                onClick={() => setOpenSection(open ? null : s.id)}
                                aria-expanded={open}
                                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left lg:hidden"
                            >
                                <span className="rounded-lg bg-purple-50 p-2 text-[#774BBE]"><Icon className="h-5 w-5" /></span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                                        {s.title}
                                        {hasError(s.id) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Champs en erreur" />}
                                    </span>
                                    <span className="truncate text-sm text-slate-500">{s.summary}</span>
                                </span>
                                <ChevronDown className={cn("h-5 w-5 flex-shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
                            </button>

                            {/* En-tête fixe (ordinateur) */}
                            <div className="hidden items-center gap-3 border-b border-slate-100 px-6 py-4 lg:flex">
                                <span className="rounded-lg bg-purple-50 p-2 text-[#774BBE]"><Icon className="h-5 w-5" /></span>
                                <h2 className="text-lg font-semibold text-slate-800">{s.title}</h2>
                            </div>

                            <div className={cn("border-t border-slate-100 p-4 lg:block lg:border-t-0 lg:p-6", open ? "block" : "hidden")}>
                                {s.content}
                            </div>
                        </section>
                    );
                })}

                {/* Barre d'enregistrement : dans le flux sur téléphone (le bouton de menu flottant
                    occupe le bas de l'écran), collante en bas sur ordinateur. */}
                <div className="relative z-20 mt-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:sticky lg:bottom-4">
                    <span className={cn("text-sm font-semibold", isDirty ? "text-amber-700" : "text-slate-500")}>
                        {isDirty ? "Modifications non enregistrées" : "Configuration à jour"}
                    </span>
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full sm:w-auto bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-lg transition-transform active:scale-95"
                    >
                        {loading ? <Spinner className="text-white w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {loading ? "Enregistrement..." : "Enregistrer la configuration"}
                    </Button>
                </div>
            </div>

            <WalletConfirmDialog
                open={walletConfirm === "enable"}
                title="Activer le portefeuille élève ?"
                confirmLabel="Activer"
                onCancel={() => setWalletConfirm(null)}
                onConfirm={() => { setWalletEnabled(true); setWalletConfirm(null); }}
            >
                <p>Dès l&apos;enregistrement de la configuration :</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>chaque vol d&apos;instruction signé (hors baptême) débitera automatiquement le compte de l&apos;élève ;</li>
                    <li>les élèves et pilotes dont le solde est nul ou négatif ne pourront plus s&apos;inscrire aux créneaux ;</li>
                    <li><strong>tous les soldes démarrent à 0 €.</strong> Pensez à enregistrer les paiements déjà reçus.</li>
                </ul>
            </WalletConfirmDialog>

            <WalletConfirmDialog
                open={walletConfirm === "disable"}
                title="Désactiver le portefeuille ?"
                confirmLabel="Désactiver"
                tone="warning"
                onCancel={() => setWalletConfirm(null)}
                onConfirm={() => { setWalletEnabled(false); setWalletConfirm(null); }}
            >
                <p>
                    Les débits automatiques et le blocage des inscriptions seront suspendus. Les soldes et l&apos;historique
                    sont conservés et réapparaîtront si vous réactivez le portefeuille.
                </p>
            </WalletConfirmDialog>
        </div>
    )
}

export default SettingsPage
