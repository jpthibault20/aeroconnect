'use client'
import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Clock, OctagonMinus, Plane, Plus, Settings, Users, X } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Separator } from '../ui/separator'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { User, userRole } from '@prisma/client'
import { IoIosWarning } from 'react-icons/io'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { z } from 'zod'
import { updateClub } from '@/api/db/club'
import { Spinner } from '../ui/SpinnerVariants'
import { toast } from '@/hooks/use-toast'

// Définition du schéma Zod
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
    timeOfSession: z.number().positive("La durée de la session doit être un nombre positif").optional(),
    userCanSubscribe: z.boolean(),
    preSubscribe: z.boolean(),
    timeDelaySubscribeminutes: z.number().optional(),
    userCanUnsubscribe: z.boolean(),
    preUnsubscribe: z.boolean(),
    timeDelayUnsubscribeminutes: z.number().optional(),
    firstNameContact: z.string().min(1, "Le prénom du contact est requis"),
    lastNameContact: z.string().min(1, "Le nom du contact est requis"),
    mailContact: z.string().email("Adresse email invalide"),
    phoneContact: z.string().regex(/^\+?\d{10,15}$/, "Numéro de téléphone invalide"),
}).refine((data) => {
    const [startHour, startMinute] = data.hourStart.split(":").map(Number);
    const [endHour, endMinute] = data.hourEnd.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    // Vérifie si la différence est d'au moins 5 heures (300 minutes)
    return endTotalMinutes - startTotalMinutes >= 300;
}, {
    message: "L'heure de fin doit être au moins 5 heures après l'heure de début",
    path: ["totalHours"], // Définit le champ qui recevra l'erreur
});


const classesULM = [
    "Paramoteur",
    "Pendulaire",
    "Multiaxe",
    "Autogire",
    "Aérostat ULM",
    "Hélicoptère ULM"
]

interface Props {
    users: User[],
}

const SettingsPage = ({ users }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const [config, setConfig] = useState({
        clubName: currentClub?.Name || '', // Remplace null par une chaîne vide
        clubId: currentClub?.id || '', // Remplace null par une chaîne vide
        address: currentClub?.Address || '',
        city: currentClub?.City || '',
        zipCode: currentClub?.ZipCode || '',
        country: currentClub?.Country || '',
        owners: currentClub?.OwnerId || [], // Tableau vide par défaut
        classes: currentClub?.classes || [], // Tableau vide par défaut
        hourStart: currentClub?.HoursOn
            ? String(currentClub.HoursOn[0]).padStart(2, '0') + ":00"
            : '00:00', // Heure par défaut si null
        hourEnd: currentClub?.HoursOn
            ? String(currentClub.HoursOn[currentClub.HoursOn.length - 1]).padStart(2, '0') + ":00"
            : '00:00',
        timeOfSession: currentClub?.SessionDurationMin || 0,
        userCanSubscribe: currentClub?.userCanSubscribe ?? false, // Assure un booléen par défaut
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
    const [submiError, setSubmiError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Fonction de validation
    const validateConfig = () => {
        const result = configSchema.safeParse(config);
        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.errors.forEach(err => {
                if (err.path[0]) {
                    newErrors[err.path[0] as string] = err.message;
                }
            });
            setErrors(newErrors);
            return false;
        }
        setErrors({});
        return true;
    };

    const handleSubmit = async () => {
        const res = validateConfig()
        if (res) {
            try {
                setLoading(true);
                const result = await updateClub(currentClub?.id as string, config)
                if (result.error) {
                    setSubmiError(result.error)
                    console.log(result.error)
                    toast({
                        title: "Configuration mise à jour avec succès",
                        duration: 5000,
                        style: {
                            background: '#ab0b0b',
                            color: '#fff',
                        },
                    });
                }
                else {
                    toast({
                        title: "Configuration mise à jour avec succès",
                        duration: 5000,
                        style: {
                            background: '#0bab15', //ab0b0b
                            color: '#fff',
                        },
                    });
                    setSubmiError(null)
                }
            } catch (error) {
                console.error("Erreur lors de la soumission des données :", error);
                setSubmiError("Une erreur est survenue lors de la soumission des données.");
            } finally {
                setLoading(false);
            }
        }
        else setSubmiError("Veuillez verfier les champs invalides")
    }

    // Handle Classes Choice
    const handleClassesChoice = (classesNumber: number) => {
        if (config.classes.includes(classesNumber)) {
            setConfig(prev => ({ ...prev, classes: prev.classes.filter(classe => classe !== classesNumber) }))
        } else {
            setConfig(prev => ({ ...prev, classes: [...prev.classes, classesNumber] }))
        }
    }

    return (
        <div className="space-y-8">
            {/* Config générales */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Settings className="mr-2" />
                        Paramètres Généraux
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className='flex justify-between w-full gap-4'>
                        <div className='w-full'>
                            <Label htmlFor="nomClub" className="text-lg">Nom du Club</Label>
                            <Input
                                id="nomClub"
                                name="nomClub"
                                value={config.clubName}
                                onChange={(e) => setConfig(prev => ({ ...prev, clubName: e.target.value }))}
                                className="mt-1"
                            />
                            {errors.clubName &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.clubName}</span>
                                </div>
                            }
                        </div>
                        <div className='w-full'>
                            <Label htmlFor="clubId" className="text-lg">Identifiant du Club</Label>
                            <Input
                                id="clubId"
                                name="clubID"
                                value={config.clubId}
                                disabled
                                className="mt-1"
                            />
                            {errors.clubId &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.clubId}</span>
                                </div>
                            }
                        </div>
                    </div>
                    <Separator />
                    <div className='space-y-3'>
                        <div className='flex justify-between w-full gap-4'>
                            <div className='w-full'>
                                <Label htmlFor="firstNameContact">Prénom du contact</Label>
                                <Input
                                    id="firstNameContact"
                                    name="firstNameContact"
                                    value={config.firstNameContact}
                                    onChange={(e) => setConfig(prev => ({ ...prev, firstNameContact: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.firstNameContact &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.firstNameContact}</span>
                                    </div>
                                }
                            </div>
                            <div className='w-full'>
                                <Label htmlFor="lastNameContact">Nom du contact</Label>
                                <Input
                                    id="lastNameContact"
                                    name="lastNameContact"
                                    value={config.lastNameContact}
                                    onChange={(e) => setConfig(prev => ({ ...prev, lastNameContact: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.lastNameContact &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.lastNameContact}</span>
                                    </div>
                                }
                            </div>
                        </div>

                        <div className='flex justify-between w-full gap-4'>
                            <div className='w-full'>
                                <Label htmlFor="mailContact">Mail du contact</Label>
                                <Input
                                    id="mailContact"
                                    name="mailContact"
                                    type='email'
                                    value={config.mailContact}
                                    onChange={(e) => setConfig(prev => ({ ...prev, mailContact: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.mailContact &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.mailContact}</span>
                                    </div>
                                }
                            </div>
                            <div className='w-full'>
                                <Label htmlFor="phoneContact">Téléphone du contact</Label>
                                <Input
                                    id="phoneContact"
                                    name="phoneContact"
                                    value={config.phoneContact}
                                    onChange={(e) => setConfig(prev => ({ ...prev, phoneContact: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.phoneContact &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.phoneContact}</span>
                                    </div>
                                }
                            </div>
                        </div>

                    </div>
                    <Separator />
                    <div>
                        <div>
                            <Label htmlFor="adresse">Adresse</Label>
                            <Textarea
                                id="adresse"
                                name="adresse"
                                value={config.address}
                                onChange={(e) => setConfig(prev => ({ ...prev, address: e.target.value }))}
                                className="mt-1"
                            />
                            {errors.adress &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.adress}</span>
                                </div>
                            }
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="ville">Ville</Label>
                                <Input
                                    id="ville"
                                    name="ville"
                                    value={config.city}
                                    onChange={(e) => setConfig(prev => ({ ...prev, city: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.city &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.city}</span>
                                    </div>
                                }
                            </div>
                            <div>
                                <Label htmlFor="codePostal">Code Postal</Label>
                                <Input
                                    id="codePostal"
                                    name="codePostal"
                                    value={config.zipCode}
                                    onChange={(e) => setConfig(prev => ({ ...prev, zipCode: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.zipCode &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.zipCode}</span>
                                    </div>
                                }
                            </div>
                            <div>
                                <Label htmlFor="pays">Pays</Label>
                                <Input
                                    id="pays"
                                    name="pays"
                                    value={config.country}
                                    onChange={(e) => setConfig(prev => ({ ...prev, country: e.target.value }))}
                                    className="mt-1"
                                />
                                {errors.country &&
                                    <div className="text-red-500 mt-2 flex space-x-3">
                                        <IoIosWarning size={20} />
                                        <span>{errors.country}</span>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Classes ULM */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Plane className="mr-2" />
                        Classes ULM Acceptées
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {classesULM.map((classe, index) => (
                            <div key={classe} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={classe}
                                    checked={config.classes.includes(index + 1)}
                                    onChange={() => handleClassesChoice(index + 1)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor={`classe-${classe}`} onClick={() => handleClassesChoice(index + 1)}>{classe}</Label>
                            </div>
                        ))}
                    </div>
                    {errors.classes &&
                        <div className="text-red-500 mt-2 flex space-x-3">
                            <IoIosWarning size={20} />
                            <span>{errors.classes}</span>
                        </div>
                    }

                </CardContent>
            </Card>

            {/* Heures de Travail */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Clock className="mr-2" />
                        Heures de Travail
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="heureDebut">Heure de début</Label>
                            <Select
                                value={config.hourStart}
                                onValueChange={(value) => setConfig((prev) => ({ ...prev, hourStart: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez l'heure de début" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => {
                                        const formattedHour = `${i.toString().padStart(2, "0")}:00`;
                                        return (
                                            <SelectItem key={formattedHour} value={formattedHour}>
                                                {formattedHour}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {errors.hourStart &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.hourStart}</span>
                                </div>
                            }
                        </div>
                        <div>
                            <Label htmlFor="heureFin">Heure de fin</Label>
                            <Select onValueChange={(value) => setConfig(prev => ({ ...prev, hourEnd: value }))} value={config.hourEnd}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez l'heure de fin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                        <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                            {`${hour.toString().padStart(2, '0')}:00`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.hourEnd &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.hourEnd}</span>
                                </div>
                            }
                        </div>
                    </div>
                    {errors.totalHours &&
                        <div className="text-red-500 mt-2 flex space-x-3">
                            <IoIosWarning size={20} />
                            <span>{errors.totalHours}</span>
                        </div>
                    }

                </CardContent>
            </Card>

            {/* Configuration élèves */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <OctagonMinus className="mr-2" />
                        Configuration sessions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className='space-y-1'>
                        <Label className="text-lg">Configuration des sessions</Label>
                        <div className="items-center justify-between">
                            <Label htmlFor="timeOfSession">Durée des sessions (en minutes)</Label>
                            <Input
                                id="timeOfSession"
                                name="timeOfSession"
                                type="number"
                                value={config.timeOfSession}
                                disabled
                                onChange={(e) => setConfig(prev => ({ ...prev, timeOfSession: Number(e.target.value) }))}
                                className="mt-1"
                            />
                            {errors.timeOfSession &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.timeOfSession}</span>
                                </div>
                            }
                        </div>
                    </div>

                    <Separator />

                    <div className='space-y-1'>
                        <Label className="text-lg">Configuration inscription</Label>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="autorisationDesinscription" className="flex-grow">Autoriser l&apos;inscriptiondes élèves</Label>
                            <Switch
                                id="autorisationInscription"
                                checked={config.userCanSubscribe}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, userCanSubscribe: checked }))}
                            />
                            {errors.userCanSubscribe &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.userCanSubscribe}</span>
                                </div>
                            }
                        </div>
                        {config.userCanSubscribe ? (
                            <div className="space-y-4 pl-6 border-l-2 border-primary">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="preInscription">Activer la pré-inscription</Label>
                                    <Switch
                                        id="preInscription"
                                        checked={config.preSubscribe}
                                        disabled
                                        onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, preSubscribe: checked }))}
                                    />
                                    {errors.preSubscribe &&
                                        <div className="text-red-500 mt-2 flex space-x-3">
                                            <IoIosWarning size={20} />
                                            <span>{errors.preSubscribe}</span>
                                        </div>
                                    }
                                </div>
                                <div>
                                    <Label htmlFor="delaisMinimuminscription">Délai minimum entre la séance et l&apos;inscription (en minutes)</Label>
                                    <Input
                                        id="delaisMinimumInscription"
                                        name="delaisMinimumInscription"
                                        type="text"
                                        value={config.timeDelaySubscribeminutes || "0"}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Vérifiez si la valeur est un nombre ou vide
                                            if (/^\d*$/.test(value)) {
                                                setConfig((prev) => ({
                                                    ...prev,
                                                    timeDelaySubscribeminutes: value === "" ? 0 : Number(value), // Remplacez les chaînes vides par 0 dans l'état
                                                }));
                                            }
                                        }}
                                        className="mt-1"
                                    />
                                    {errors.timeDelaySubscribeminutes &&
                                        <div className="text-red-500 mt-2 flex space-x-3">
                                            <IoIosWarning size={20} />
                                            <span>{errors.timeDelaySubscribeminutes}</span>
                                        </div>
                                    }
                                </div>
                            </div>

                        ) : (
                            <div className="flex justify-start gap-2 items-center text-orange-500 mt-6">
                                <span>Attention, dans cette configuration, les élèves ne pourront pas s&apos;inscrire au dufférentes sessions</span>
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className='space-y-1'>
                        <Label className="text-lg">Configuration désinscription</Label>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="autorisationDesinscription" className="flex-grow">Autoriser la désinscription des élèves</Label>
                            <Switch
                                id="autorisationDesinscription"
                                checked={config.userCanUnsubscribe}
                                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, userCanUnsubscribe: checked }))}
                            />
                            {errors.userCanUnsubscribe &&
                                <div className="text-red-500 mt-2 flex space-x-3">
                                    <IoIosWarning size={20} />
                                    <span>{errors.userCanUnsubscribe}</span>
                                </div>
                            }
                        </div>
                        {config.userCanUnsubscribe ? (
                            <div className="space-y-4 pl-6 border-l-2 border-primary">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="preDesinscription">Activer la pré-désinscription</Label>
                                    <Switch
                                        id="preDesinscription"
                                        checked={config.preUnsubscribe}
                                        disabled
                                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, preUnsubscribe: checked }))}
                                    />
                                    {errors.preUnsubscribe &&
                                        <div className="text-red-500 mt-2 flex space-x-3">
                                            <IoIosWarning size={20} />
                                            <span>{errors.preUnsubscribe}</span>
                                        </div>
                                    }
                                </div>
                                <div>
                                    <Label htmlFor="delaisMinimumDesinscription">
                                        Délai minimum entre la séance et la désinscription (en minutes)
                                    </Label>
                                    <Input
                                        id="delaisMinimumDesinscription"
                                        name="delaisMinimumDesinscription"
                                        type="text"
                                        value={config.timeDelayUnsubscribeminutes || "0"}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Vérifiez si la valeur est un nombre ou vide
                                            if (/^\d*$/.test(value)) {
                                                setConfig((prev) => ({
                                                    ...prev,
                                                    timeDelayUnsubscribeminutes: value === "" ? 0 : Number(value), // Remplacez les chaînes vides par 0 dans l'état
                                                }));
                                            }
                                        }}
                                        className="mt-1"
                                    />
                                    {errors.timeDelayUnsubscribeminutes &&
                                        <div className="text-red-500 mt-2 flex space-x-3">
                                            <IoIosWarning size={20} />
                                            <span>{errors.timeDelayUnsubscribeminutes}</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-start gap-2 items-center text-orange-500 mt-6">
                                <span>Attention, dans cette configuration, les élèves ne pourront pas se désinscrire au différentes sessions</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Présidents du Club */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Users className="mr-2" />
                        Présidents du Club
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Boucle sur les présidents dans config.owners */}
                        {config.owners.map((owner, index) => {
                            // Trouver l'utilisateur correspondant à l'ID dans `president`
                            const selectedUser = users.find((user) => user.id === owner);

                            return (
                                <div key={index} className="flex items-center space-x-2">
                                    {/* Select pour choisir un président */}
                                    <Select
                                        value={owner} // L'identifiant de l'utilisateur sélectionné
                                        onValueChange={(value) => {
                                            // Mise à jour du tableau config.owners
                                            const newPresidents = [...config.owners];
                                            newPresidents[index] = value;
                                            setConfig((prev) => ({ ...prev, owners: newPresidents }));
                                        }}
                                    >
                                        <SelectTrigger
                                            className="flex-grow"
                                            disabled={config.owners.includes(currentUser?.id as string)}

                                        >
                                            <SelectValue>
                                                {selectedUser ? (
                                                    `${selectedUser.firstName} ${selectedUser.lastName}`
                                                ) : (
                                                    "Sélectionnez un président"
                                                )}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Liste des utilisateurs */}
                                            {users.map((user) => {
                                                if (user.role === userRole.ADMIN) return null;
                                                return (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.firstName} {user.lastName}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>

                                    {/* Bouton pour supprimer un président */}
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        disabled={currentUser?.id === owner}
                                        onClick={() => {
                                            const newPresidents = config.owners.filter((_, i) => i !== index);
                                            setConfig((prev) => ({ ...prev, owners: newPresidents }));
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}

                        {/* Bouton pour ajouter un nouveau président */}
                        <Button
                            variant="outline"
                            onClick={() => setConfig((prev) => ({ ...prev, owners: [...prev.owners, ""] }))}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter un président
                        </Button>
                        {errors.owners &&
                            <div className="text-red-500 mt-2 flex space-x-3">
                                <IoIosWarning size={20} />
                                <span>{errors.owners}</span>
                            </div>
                        }
                    </div>
                </CardContent>
            </Card>
            <CardFooter className="flex justify-start lg:justify-end">
                <div className='space-y-3'>
                    {submiError &&
                        <div className="text-red-500 mt-2 flex space-x-3">
                            <IoIosWarning size={20} />
                            <span>{submiError}</span>
                        </div>
                    }
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <Spinner />
                        ) : (
                            'Enregistrer la configuration'
                        )}
                    </Button>
                </div>
            </CardFooter>
        </div>
    )
}

export default SettingsPage
