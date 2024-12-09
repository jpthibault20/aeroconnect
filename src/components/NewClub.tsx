"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { createClub } from "@/api/db/club";
import { useRouter } from "next/navigation";

// Schéma de validation avec Zod
const clubFormSchema = z.object({
    name: z.string().min(1, "Le nom du club est requis"),
    id: z.string().min(6, "L'ID du club n'est pas valide").max(6, "L'ID du club n'est pas valide"),
    address: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    workStartTime: z.string().min(1, "L'heure de début est requise"),
    workEndTime: z.string().min(1, "L'heure de fin est requise"),
    sessionDuration: z
        .number()
        .min(30, "La durée des sessions doit être d'au moins 30 minutes")
        .refine((value) => value % 15 === 0, {
            message: "La durée des sessions doit être un multiple de 15 minutes.",
        }),
}).refine(
    (data) => parseInt(data.workEndTime) - parseInt(data.workStartTime) >= 3,
    {
        path: ["workEndTime"],
        message: "La plage horaire doit être d'au moins 3 heures.",
    }
);

export type ClubFormValues = z.infer<typeof clubFormSchema>;

interface Props {
    setNewClub: React.Dispatch<React.SetStateAction<boolean>>;
}

const NewClub = ({ setNewClub }: Props) => {
    const [formError, setFormError] = useState<string | null>(null);
    const { currentUser } = useCurrentUser();
    const router = useRouter();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ClubFormValues>({
        resolver: zodResolver(clubFormSchema),
    });

    const onSubmit = (data: ClubFormValues) => {
        const createClubAPI = async () => {
            const res = await createClub(data, currentUser?.id as string);
            if (res.error) {
                setFormError(res.error);
            }
            else if (res.success) {
                setNewClub(false);
                setFormError(null);
                console.log('/calendar?clubID=' + data.id);
                router.replace('/calendar?clubID=' + data.id);
            }
        };
        createClubAPI();
    };

    const hours = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, "0")
    );

    return (
        <div className="flex flex-col justify-center items-center space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
                {/* Nom du club */}
                <div className="space-y-2">
                    <Label htmlFor="name">Nom du club</Label>
                    <Input
                        id="name"
                        placeholder="Nom du club"
                        {...register("name")}
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>

                {/* ID du club */}
                <div className="space-y-2">
                    <Label htmlFor="id">ID du club (LF_ _ _ _)</Label>
                    <Input
                        id="id"
                        placeholder="ID du club"
                        {...register("id")}
                    />
                    {errors.id && <p className="text-red-500 text-sm">{errors.id.message}</p>}
                </div>

                {/* Adresse */}
                <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea
                        id="address"
                        placeholder="Numéro et nom de rue"
                        {...register("address")}
                    />
                    {errors.address && (
                        <p className="text-red-500 text-sm">{errors.address.message}</p>
                    )}
                </div>

                {/* Ville et code postal */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="zipCode">Code postal</Label>
                        <Input
                            id="zipCode"
                            placeholder="Code postal"
                            {...register("zipCode")}
                        />
                        {errors.zipCode && (
                            <p className="text-red-500 text-sm">{errors.zipCode.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                            id="city"
                            placeholder="Ville"
                            {...register("city")}
                        />
                        {errors.city && (
                            <p className="text-red-500 text-sm">{errors.city.message}</p>
                        )}
                    </div>
                </div>

                {/* Heures de travail */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="workStartTime">Début de la journée</Label>
                        <Controller
                            name="workStartTime"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Début" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hours.map((hour) => (
                                            <SelectItem key={hour} value={hour}>
                                                {hour}:00
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.workStartTime && (
                            <p className="text-red-500 text-sm">
                                {errors.workStartTime.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="workEndTime">Fin de la journée</Label>
                        <Controller
                            name="workEndTime"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Fin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hours.map((hour) => (
                                            <SelectItem key={hour} value={hour}>
                                                {hour}:00
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.workEndTime && (
                            <p className="text-red-500 text-sm">
                                {errors.workEndTime.message}
                            </p>
                        )}
                    </div>
                </div>

                {/* Durée des sessions */}
                <div className="space-y-2">
                    <Label htmlFor="sessionDuration">Durée des sessions (minutes)</Label>
                    <Input
                        id="sessionDuration"
                        type="number"
                        placeholder="Durée (ex : 30)"
                        {...register("sessionDuration", { valueAsNumber: true })}
                    />
                    {errors.sessionDuration && (
                        <p className="text-red-500 text-sm">
                            {errors.sessionDuration.message}
                        </p>
                    )}
                </div>

                {/* Boutons */}
                <div className="flex justify-end space-x-4">
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setNewClub(false)}
                        className="text-gray-500"
                    >
                        Retour
                    </Button>
                    <Button type="submit" variant="perso">
                        Créer le club
                    </Button>
                </div>
            </form>

            {formError && <p className="text-red-500 text-sm">{formError}</p>}
        </div>
    );
};

export default NewClub;
