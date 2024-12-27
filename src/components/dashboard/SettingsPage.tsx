'use client'
import React, { useEffect, useState } from 'react'
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
    const [errorClasses, setErrorClasses] = useState<string | null>(null);
    const [errorHours, setErrorHours] = useState<string | null>(null);
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [config, setConfig] = useState({
        clubName: currentClub?.Name,
        clubId: currentClub?.id,
        adress: currentClub?.Address || '',
        city: currentClub?.City || '',
        zipCode: currentClub?.ZipCode || '',
        country: currentClub?.Country || '',
        owners: currentClub?.OwnerId || [],
        classes: currentClub?.classes || [],
        hourStart: String(currentClub?.HoursOn[0]).padStart(2, '0') + ":00",
        hourEnd: String(currentClub?.HoursOn[currentClub?.HoursOn.length - 1]).padStart(2, '0') + ":00",
        timeOfSession: currentClub?.SessionDurationMin,
        userCanSubscribe: currentClub?.userCanSubscribe,
        preSubscribe: currentClub?.preSubscribe,
        timeDelaySubscribeminutes: currentClub?.timeDelaySubscribeminutes,
        userCanUnsubscribe: currentClub?.userCanUnsubscribe,
        preUnsubscribe: currentClub?.preUnsubscribe,
        timeDelayUnsubscribeminutes: currentClub?.timeDelayUnsubscribeminutes,
        firstNameContact: currentClub?.firstNameContact as string,
        lastNameContact: currentClub?.lastNameContact as string,
        mailContact: currentClub?.mailContact as string,
        phoneContact: currentClub?.phoneContact as string,
    });

    // Check Error Classes
    useEffect(() => {
        if (config.classes.length === 0) {
            setErrorClasses('Veuillez sélectionner au moins une classe ULM')
        } else {
            setErrorClasses(null)
        }
    }, [config.classes]);

    // Check Error Hours
    useEffect(() => {
        const startNumber = Number(config.hourStart.slice(0, 2))
        const endNumber = Number(config.hourEnd.slice(0, 2))

        if (endNumber - startNumber < 5) {
            setErrorHours('La durée  doit être supérieure à 5 heures')
        }
        else {
            setErrorHours(null)
        }
    }, [config.hourStart, config.hourEnd]);

    // Check Error General
    useEffect(() => {
        if (config.clubName?.length === 0) {
            setErrorGeneral('Veuillez renseigner le nom du club');
        } else {
            setErrorGeneral(null);
        }
    }, [config.clubName, config.clubId]);

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
                            </div>
                        </div>

                        <div className='flex justify-between w-full gap-4'>
                            <div className='w-full'>
                                <Label htmlFor="mailContact">Mail du contact</Label>
                                <Input
                                    id="mailContact"
                                    name="mailContact"
                                    value={config.mailContact}
                                    onChange={(e) => setConfig(prev => ({ ...prev, mailContact: e.target.value }))}
                                    className="mt-1"
                                />
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
                                value={config.adress}
                                onChange={(e) => setConfig(prev => ({ ...prev, adress: e.target.value }))}
                                className="mt-1"
                            />
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
                            </div>
                        </div>
                    </div>
                    {errorGeneral &&
                        (
                            <div className="flex justify-start gap-2 items-center text-red-500 mt-6">
                                <IoIosWarning size={20} />
                                <span>{errorGeneral}</span>
                            </div>
                        )}
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
                                <Label htmlFor={`classe-${classe}`}>{classe}</Label>
                            </div>
                        ))}
                    </div>
                    {errorClasses &&
                        (
                            <div className="flex justify-start gap-2 items-center text-red-500 mt-6">
                                <IoIosWarning size={20} />
                                <span>{errorClasses}</span>
                            </div>
                        )}
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
                        </div>
                    </div>
                    {errorHours &&
                        (
                            <div className="flex justify-start gap-2 items-center text-red-500 mt-6">
                                <IoIosWarning size={20} />
                                <span>{errorHours}</span>
                            </div>
                        )}
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
                        </div>
                        {config.userCanSubscribe ? (
                            <div className="space-y-4 pl-6 border-l-2 border-primary">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="preInscription">Activer la pré-inscription</Label>
                                    <Switch
                                        id="preInscription"
                                        checked={config.preSubscribe}
                                        onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, preSubscribe: checked }))}
                                    />
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
                        </div>
                        {config.userCanUnsubscribe ? (
                            <div className="space-y-4 pl-6 border-l-2 border-primary">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="preDesinscription">Activer la pré-désinscription</Label>
                                    <Switch
                                        id="preDesinscription"
                                        checked={config.preUnsubscribe}
                                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, preUnsubscribe: checked }))}
                                    />
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
                    </div>
                </CardContent>
            </Card>


            <CardFooter className="flex justify-start lg:justify-end">
                <Button
                    size="lg"
                    onClick={() => { console.log(config) }}
                >
                    Enregistrer la configuration
                </Button>
            </CardFooter>
        </div>
    )
}

export default SettingsPage
