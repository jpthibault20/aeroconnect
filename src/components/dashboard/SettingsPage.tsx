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

const classesULM = [
    "Paramoteur",
    "Pendulaire",
    "Multiaxe",
    "Autogire",
    "Aérostat ULM",
    "Hélicoptère ULM"
]

const SettingsPage = () => {
    const [config, setConfig] = useState({
        nomClub: '',
        desinscriptionSessions: 'non',
        delaisDesinscription: '',
        inscriptionCommeAnnulation: 'non',
        classesAcceptees: [""],
        heureDebut: '',
        heureFin: '',
        adresse: '',
        ville: '',
        codePostal: '',
        pays: '',
        presidents: [""],
        autorisationDesinscription: 'non',
        delaisMinimumDesinscription: '',
        preDesinscription: 'non',
        delaisMinimumInscription: '',
        preInscription: 'non',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setConfig(prev => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setConfig(prev => ({ ...prev, [name]: value }))
    }

    const handleClassesChange = (className: string) => {
        setConfig(prev => ({
            ...prev,
            classesAcceptees: prev.classesAcceptees.includes(className)
                ? prev.classesAcceptees.filter(c => c !== className)
                : [...prev.classesAcceptees, className]
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Configuration soumise:', config)
        // Ici, vous pouvez ajouter la logique pour envoyer les données au serveur
    }

    return (
        <div onSubmit={handleSubmit} className="space-y-8">
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
                        <Input id="nomClub" name="nomClub" value={config.nomClub} onChange={handleChange} className="mt-1" />
                    </div>

                    <Separator />
                    <div>
                        <div>
                            <Label htmlFor="adresse">Adresse</Label>
                            <Textarea id="adresse" name="adresse" value={config.adresse} onChange={handleChange} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="ville">Ville</Label>
                                <Input id="ville" name="ville" value={config.ville} onChange={handleChange} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="codePostal">Code Postal</Label>
                                <Input id="codePostal" name="codePostal" value={config.codePostal} onChange={handleChange} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="pays">Pays</Label>
                                <Input id="pays" name="pays" value={config.pays} onChange={handleChange} className="mt-1" />
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
                                    id={`classe-${classe}`}
                                    checked={config.classesAcceptees.includes(classe)}
                                    onChange={() => handleClassesChange(classe)}
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
                            <Select onValueChange={(value) => handleSelectChange('heureDebut', value)}>
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
                            <Select onValueChange={(value) => handleSelectChange('heureFin', value)}>
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
                            <Label htmlFor="autorisationDesinscription" className="flex-grow">Autoriser la désinscription</Label>
                            <Switch
                                id="autorisationDesinscription"
                                checked={config.autorisationDesinscription === 'oui'}
                                onCheckedChange={(checked) => handleSelectChange('autorisationDesinscription', checked ? 'oui' : 'non')}
                            />
                        </div>

                        {config.autorisationDesinscription === 'oui' && (
                            <div className="space-y-4 pl-6 border-l-2 border-primary">
                                <div>
                                    <Label htmlFor="delaisMinimumDesinscription">Délai minimum pour se désinscrire (en heures)</Label>
                                    <Input
                                        id="delaisMinimumDesinscription"
                                        name="delaisMinimumDesinscription"
                                        type="number"
                                        value={config.delaisMinimumDesinscription}
                                        onChange={handleChange}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="preDesinscription">Activer la pré-désinscription</Label>
                                    <Switch
                                        id="preDesinscription"
                                        checked={config.preDesinscription === 'oui'}
                                        onCheckedChange={(checked) => handleSelectChange('preDesinscription', checked ? 'oui' : 'non')}
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
                                value={config.delaisMinimumInscription}
                                onChange={handleChange}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="preInscription">Activer la pré-inscription</Label>
                            <Switch
                                id="preInscription"
                                checked={config.preInscription === 'oui'}
                                onCheckedChange={(checked) => handleSelectChange('preInscription', checked ? 'oui' : 'non')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="inscriptionCommeAnnulation">Inscription comme l&apos;annulation</Label>
                            <Switch
                                id="inscriptionCommeAnnulation"
                                checked={config.inscriptionCommeAnnulation === 'oui'}
                                onCheckedChange={(checked) => handleSelectChange('inscriptionCommeAnnulation', checked ? 'oui' : 'non')}
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
                        {config.presidents.map((president, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <Select
                                    value={president}
                                    onValueChange={(value) => {
                                        const newPresidents = [...config.presidents];
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
                                        const newPresidents = config.presidents.filter((_, i) => i !== index);
                                        setConfig(prev => ({ ...prev, presidents: newPresidents }));
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            onClick={() => setConfig(prev => ({ ...prev, presidents: [...prev.presidents, ''] }))}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Ajouter un président
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <CardFooter className="flex justify-start lg:justify-end">
                <Button onClick={handleSubmit} size="lg">Enregistrer la configuration</Button>
            </CardFooter>
        </div>
    )
}

export default SettingsPage
