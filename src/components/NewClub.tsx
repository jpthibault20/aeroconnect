'use client';

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { createClub } from "@/api/db/club";
import { Spinner } from "./ui/SpinnerVariants";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    LockKeyhole,
    Building2,
    MapPin,
    Clock,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import codeNewClubIsValid from "@/api/client/newClubValidation";
import { clubFormSchema, ClubFormValues } from "@/schemas/club";

interface Props {
    setNewClub: React.Dispatch<React.SetStateAction<boolean>>;
}

const NewClub = ({ setNewClub }: Props) => {
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [authorizedCreateNewClub, setAuthorizedCreateNewClub] = useState(false);
    const [code, setCode] = useState("");
    const [errorOTP, setErrorOTP] = useState("");

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ClubFormValues>({
        resolver: zodResolver(clubFormSchema),
        // Real values, not placeholders: 09:00-18:00 can be kept without touching the selects.
        defaultValues: { sessionDuration: 60, workStartTime: "09", workEndTime: "18" },
    });

    const onSubmit = async (data: ClubFormValues) => {
        setLoading(true);
        setFormError(null);
        try {
            const res = await createClub(data, Number(code));
            if (res.error) {
                setFormError(res.error);
            } else if (res.success) {
                window.location.href = '/calendar?clubID=' + data.id;
            }
        } catch {
            setFormError("Une erreur technique est survenue.");
        } finally {
            setLoading(false);
        }
    };

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

    const onSubmitOTP = async () => {
        if (await codeNewClubIsValid(Number(code))) {
            setAuthorizedCreateNewClub(true);
            setErrorOTP("");
        } else {
            setErrorOTP("Code de sécurité incorrect.");
        }
    };

    const inputStyle = "bg-slate-50 border-slate-200 focus:ring-[#774BBE] focus:border-[#774BBE]";
    const sectionTitleStyle = "text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 pb-1 border-b border-slate-100";

    // --- SCREEN 1: CREATION FORM ---
    if (authorizedCreateNewClub) {
        return (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    <div>
                        <h3 className={sectionTitleStyle}>
                            <Building2 className="w-4 h-4 text-[#774BBE]" /> Identité du Club
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Nom officiel</Label>
                                <Input id="name" placeholder="Ex: Aéroclub de l'Est" {...register("name")} className={inputStyle} />
                                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="id">Identifiant Unique (Code OACI/LF)</Label>
                                <Input id="id" placeholder="Ex: LFKZ" {...register("id")} className={cn(inputStyle, "uppercase")} />
                                {errors.id && <p className="text-xs text-red-500">{errors.id.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className={sectionTitleStyle}>
                            <MapPin className="w-4 h-4 text-[#774BBE]" /> Localisation
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="address">Adresse</Label>
                                <Textarea id="address" placeholder="Rue, aérodrome..." {...register("address")} className={cn(inputStyle, "min-h-[60px]")} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="zipCode">Code Postal</Label>
                                    <Input id="zipCode" placeholder="75000" {...register("zipCode")} className={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="city">Ville</Label>
                                    <Input id="city" placeholder="Paris" {...register("city")} className={inputStyle} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className={sectionTitleStyle}>
                            <Clock className="w-4 h-4 text-[#774BBE]" /> Paramètres par défaut
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Ouverture</Label>
                                <Controller
                                    name="workStartTime"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className={inputStyle}><SelectValue placeholder="Choisir" /></SelectTrigger>

                                            {/* z-[10000] to stay above the dialog, max-h for scrolling */}
                                            <SelectContent className="max-h-[200px] z-[10000]">
                                                {hours.map(h => <SelectItem key={h} value={h}>{h}:00</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Fermeture</Label>
                                <Controller
                                    name="workEndTime"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className={inputStyle}><SelectValue placeholder="Choisir" /></SelectTrigger>

                                            {/* z-[10000] to stay above the dialog, max-h for scrolling */}
                                            <SelectContent className="max-h-[200px] z-[10000]">
                                                {hours.map(h => <SelectItem key={h} value={h}>{h}:00</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>
                        {errors.workStartTime && <p className="text-xs text-red-500 mt-1">{errors.workStartTime.message}</p>}
                        {errors.workEndTime && <p className="text-xs text-red-500 mt-1">{errors.workEndTime.message}</p>}
                    </div>

                    {formError && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <span>⚠️</span> {formError}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setNewClub(false)}
                            className="text-slate-500 hover:text-slate-800"
                            disabled={loading}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white min-w-[130px]"
                        >
                            {loading ? <Spinner className="text-white w-4 h-4" /> : "Créer le club"}
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    // --- SCREEN 2: OTP VERIFICATION ---
    else {
        return (
            <div className="flex flex-col items-center justify-center py-6 space-y-6 animate-in zoom-in-95 duration-300">

                <div className="h-16 w-16 bg-purple-50 rounded-full flex items-center justify-center mb-2">
                    <LockKeyhole className="w-8 h-8 text-[#774BBE]" />
                </div>

                <div className="text-center space-y-1 max-w-xs">
                    <h3 className="font-semibold text-slate-900">Accès Restreint</h3>
                    <p className="text-sm text-slate-500">
                        La création d&apos;un nouveau club est protégée. Veuillez saisir le code administrateur.
                    </p>
                </div>

                <div className="space-y-2 flex flex-col items-center">
                    <InputOTP
                        maxLength={4}
                        value={code}
                        onChange={(val) => setCode(val)}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} className="border-slate-200" />
                            <InputOTPSlot index={1} className="border-slate-200" />
                            <InputOTPSlot index={2} className="border-slate-200" />
                            <InputOTPSlot index={3} className="border-slate-200" />
                        </InputOTPGroup>
                    </InputOTP>

                    <div className="h-6 flex items-center">
                        {errorOTP && <p className="text-xs text-red-500 font-medium animate-pulse">{errorOTP}</p>}
                    </div>
                </div>

                <div className="flex gap-3 w-full pt-4">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => setNewClub(false)}
                        className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={onSubmitOTP}
                        className="flex-1 bg-[#774BBE] hover:bg-[#6538a5] text-white"
                        disabled={code.length < 4}
                    >
                        Valider <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }
};

export default NewClub;