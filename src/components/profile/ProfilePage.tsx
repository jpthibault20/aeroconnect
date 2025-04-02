"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { User, userRole } from '@prisma/client';
import { updateUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { signOut } from '@/app/auth/login/action';
import { Spinner } from '../ui/SpinnerVariants';
import InputClasses from '../InputClasses';

const ProfilePage = () => {
    const [loading, setLoading] = useState(false);
    const { currentUser } = useCurrentUser();
    const [classes, setClasses] = useState<number[]>(currentUser?.classes || []);
    const [profile, setProfile] = useState<User>(currentUser || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        adress: '',
        city: '',
        zipCode: '',
        country: '',
        role: userRole.USER,
        clubID: '',
        restricted: false,
        clubIDRequest: '',
        id: '',
        classes: [],
        canSubscribeWithoutPlan: false,
    })

    useEffect(() => {
        setProfile({ ...profile, classes })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classes])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const updateUserAction = async () => {
            setLoading(true);
            try {
                const res = await updateUser(profile);
                if (res.success) {
                    setLoading(false);
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
                        title: " Oups, une erreur est survenue",
                        duration: 5000,
                        style: {
                            background: '#ab0b0b', //rouge : ab0b0b
                            color: '#fff',
                        }
                    });
                }
            } catch (error) {
                console.log(error);
            }
        }
        updateUserAction();
    }

    const handleLogout = () => {
        signOut();
    }

    return (
        <div className="container mx-auto p-4 pb-16">
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Profil Utilisateur</CardTitle>
                    <CardDescription>Mettez à jour vos informations personnelles</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Prénom</Label>
                                <Input id="firstName" name="firstName" value={profile.firstName || ""} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Nom</Label>
                                <Input id="lastName" name="lastName" value={profile.lastName || ""} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" value={profile.email || ""} onChange={handleChange} required disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input id="phone" name="phone" type="tel" value={profile.phone || ""} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adress">Adresse</Label>
                            <Input id="adress" name="adress" value={profile.adress || ""} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Ville</Label>
                                <Input id="city" name="city" value={profile.city || ""} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zipCode">Code Postal</Label>
                                <Input id="zipCode" name="zipCode" value={profile.zipCode || ""} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Pays</Label>
                            <Input id="country" name="country" value={profile.country || ""} onChange={handleChange} />
                        </div>
                        <div>
                            <InputClasses
                                disabled={loading || currentUser?.role !== userRole.OWNER && currentUser?.role !== userRole.ADMIN && currentUser?.role !== userRole.MANAGER}
                                classes={classes}
                                setClasses={setClasses}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button type="submit">
                            {loading ? (
                                <Spinner />
                            ) : (
                                'Enregistrer'
                            )}
                        </Button>
                        <Button variant="outline" type='button' disabled={loading} onClick={handleLogout}>Déconnexion</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default ProfilePage;
