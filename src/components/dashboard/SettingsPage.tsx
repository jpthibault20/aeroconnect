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
import { Club } from '@prisma/client'

const classesULM = [
    "Paramoteur",
    "Pendulaire",
    "Multiaxe",
    "Autogire",
    "Aérostat ULM",
    "Hélicoptère ULM"
]

interface Props {
    club: Club
}

const SettingsPage = ({ club }: Props) => {
    const [config, setConfig] = useState({
        clubName: club.Name || '',
        adress: club.Address || '',
        city: club.City || '',
        zipCode: club.ZipCode || '',
        country: club.Country || '',
        owners: club.OwnerId || [''],
        classes: [0],
        hourStart: String(club.HoursOn[0]) || '9',
        hourEnd: String(club.HoursOn[-1]) || '19',
        userCanSubscribe: true,
        preSubscribe: false,
        timeDelaySubscribeminutes: 0,
        userCanUnsubscribeSessions: false,
        preUnsubscribe: false,
        timeDelayUnsubscribeminutes: 0,
    })

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Settings className="mr-2" />
                        Paramètres Généraux
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label htmlFor="nomClub" className="text-lg">Nom du Club</Label>
                        <Input id="nomClub" name="nomClub" value={config.clubName} className="mt-1" />
                    </div>

                    <Separator />
                    <div>
                        <div>
                            <Label htmlFor="adresse">Adresse</Label>
                            <Textarea id="adresse" name="adresse" value={config.adress} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="ville">Ville</Label>
                                <Input id="ville" name="ville" value={config.city} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="codePostal">Code Postal</Label>
                                <Input id="codePostal" name="codePostal" value={config.zipCode} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="pays">Pays</Label>
                                <Input id="pays" name="pays" value={config.country} className="mt-1" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Plane className="mr-2" />
                        Classes ULM Acceptées
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {classesULM.map((classe) => (
                            <div key={classe} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={classe}
                                    checked={false}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor={`classe-${classe}`}>{classe}</Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

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
                            <Select >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez l'heure de début" />
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
                        <div>
                            <Label htmlFor="heureFin">Heure de fin</Label>
                            <Select >
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <OctagonMinus className="mr-2" />
                        Configuration élèves
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <Label className="text-lg">Paramètres d&apos;Inscription et de Désinscription</Label>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="autorisationDesinscription" className="flex-grow">Autoriser la désinscription des élèves</Label>
                            <Switch
                                id="autorisationDesinscription"
                                checked={config.userCanUnsubscribeSessions}
                            />
                        </div>

                        {config.userCanUnsubscribeSessions && (
                            <div className="space-y-4 pl-6 border-l-2 border-primary">
                                <div>
                                    <Label htmlFor="delaisMinimumDesinscription">Délai minimum pour se désinscrire (en heures)</Label>
                                    <Input
                                        id="delaisMinimumDesinscription"
                                        name="delaisMinimumDesinscription"
                                        type="number"
                                        value={config.timeDelayUnsubscribeminutes / 60}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="preDesinscription">Activer la pré-désinscription</Label>
                                    <Switch
                                        id="preDesinscription"
                                        checked={config.preUnsubscribe}
                                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, preUnsubscribe: checked }))}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="delaisMinimumInscription">Délai minimum pour s&apos;inscrire (en heures)</Label>
                            <Input
                                id="delaisMinimumInscription"
                                name="delaisMinimumInscription"
                                type="number"
                                value={config.timeDelaySubscribeminutes / 60}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="preInscription">Activer la pré-inscription</Label>
                            <Switch
                                id="preInscription"
                                checked={config.preSubscribe}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="userCanSubscribe">userCanSubscribe</Label>
                            <Switch
                                id="userCanSubscribe"
                                checked={config.userCanSubscribe}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Users className="mr-2" />
                        Présidents du Club
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {config.owners.map((president, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <Select
                                    value={president}
                                    onValueChange={(value) => {
                                        const newPresidents = [...config.owners];
                                        newPresidents[index] = value;
                                        setConfig(prev => ({ ...prev, presidents: newPresidents }));
                                    }}
                                >
                                    <SelectTrigger className="flex-grow">
                                        <SelectValue placeholder="Sélectionnez un président" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Ici, vous devriez charger dynamiquement la liste des utilisateurs */}
                                        <SelectItem value="user1">Utilisateur 1</SelectItem>
                                        <SelectItem value="user2">Utilisateur 2</SelectItem>
                                        <SelectItem value="user3">Utilisateur 3</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                        const newPresidents = config.owners.filter((_, i) => i !== index);
                                        setConfig(prev => ({ ...prev, presidents: newPresidents }));
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            onClick={() => setConfig(prev => ({ ...prev, presidents: [...prev.owners, ''] }))}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter un président
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <CardFooter className="flex justify-start lg:justify-end">
                <Button size="lg">Enregistrer la configuration</Button>
            </CardFooter>
        </div>
    )
}

export default SettingsPage
