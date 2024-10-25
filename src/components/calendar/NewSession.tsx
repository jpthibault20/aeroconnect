import React, { useState, useMemo } from 'react';
import { IoMdAddCircle } from "react-icons/io";
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { fr } from "date-fns/locale";
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { minutes, sessionDurationMin, workingHour } from '@/config/configClub';
import { FaArrowRightLong } from "react-icons/fa6";
import { planeExemple } from '@/config/exempleData';

interface Props {
    display: string;  ///< Defines how the button should be displayed ("phone" or "desktop").
    style?: string;   ///< Optional CSS classes for styling the button in phone mode.
}

const NewSession = ({ display }: Props) => {
    const { currentUser } = useCurrentUser();

    // Regrouping date and time states to avoid multiple useState hooks
    const [sessionData, setSessionData] = useState<{
        date: Date | undefined;
        startHour: string;
        startMinute: string;
        plane: string[];  // Correction : explicitement un tableau de chaînes de caractères
    }>({
        date: undefined,
        startHour: "9",
        startMinute: "30",
        plane: [],  // Maintenant de type string[]
    });
    // Memoize end time calculation based on start hour and minute
    const endTime = useMemo(() => {
        return new Date(1999, 0, 0, Number(sessionData.startHour), Number(sessionData.startMinute) + sessionDurationMin);
    }, [sessionData.startHour, sessionData.startMinute]);

    // Memoize final date only when date changes
    const finalDate = useMemo(() => {
        if (sessionData.date) {
            return new Date(
                sessionData.date.getFullYear(),
                sessionData.date.getMonth(),
                sessionData.date.getDate(),
                Number(sessionData.startHour),
                Number(sessionData.startMinute)
            );
        }
        return undefined;
    }, [sessionData.date, sessionData.startHour, sessionData.startMinute]);

    // If user is not allowed to create a session, return null
    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT))) {
        return null;
    }

    const onClickPlane = (plane: string) => {
        setSessionData(prev => ({
            ...prev, // Copie de tous les autres champs de sessionData
            plane: prev.plane.includes(plane)
                ? prev.plane.filter(p => p !== plane) // Supprime l'avion s'il est déjà dans la liste
                : [...prev.plane, plane] // Ajoute l'avion à la liste s'il n'y est pas
        }));
    };

    console.log(finalDate);

    return (
        <Dialog>
            <DialogTrigger className={`${display === "desktop" ? "bg-[#774BBE] hover:bg-[#3d2365] text-white" : "bg-white"} rounded-md px-2 font-medium`}>
                {display === "desktop" ? <p>Nouvelle session</p> : <IoMdAddCircle size={27} color='#774BBE' />}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nouvelle session</DialogTitle>
                    <DialogDescription>Configuration de la nouvelle session</DialogDescription>
                </DialogHeader>

                {/* Selection of start date */}
                <Label>Date de la session</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("justify-start text-left font-normal", !sessionData.date && "text-muted-foreground")}>
                            <CalendarIcon />
                            {sessionData.date ? format(sessionData.date, "PPP", { locale: fr }) : <span>Sélectionnez une date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                        <Calendar
                            mode="single"
                            selected={sessionData.date}
                            onSelect={(date) => setSessionData(prev => ({ ...prev, date }))}
                            initialFocus
                            locale={fr}
                        />
                    </PopoverContent>
                </Popover>

                {/* Time selection */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <Select value={sessionData.startHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, startHour: value }))}>
                            <SelectTrigger className="w-[65px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {workingHour.map((h) => (
                                    <SelectItem key={`start-${h}`} value={h.toString()}>
                                        {h}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p>h</p>
                        <Select value={sessionData.startMinute} onValueChange={(value) => setSessionData(prev => ({ ...prev, startMinute: value }))}>
                            <SelectTrigger className="w-[65px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {minutes.map((m) => (
                                    <SelectItem key={`start-${m}`} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <FaArrowRightLong color="gray" size={20} />
                    <div className="flex items-center space-x-2">
                        <div className="text-gray-500 border border-gray-200 p-1 px-3 rounded-md shadow-sm">
                            {endTime.getHours().toString().padStart(2, '0')}
                        </div>
                        <p>h</p>
                        <div className="text-gray-500 border border-gray-200 p-1 px-3 rounded-md shadow-sm">
                            {endTime.getMinutes().toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>

                {/* Selection plane */}
                <Label>Avion(s)</Label>
                <div className='w-full h-fit min-h-10 border border-gray-200 rounded-md shadow-sm flex flex-wrap p-2 gap-2'>
                    {sessionData.plane.map((plane, index) => (
                        <div
                            key={index}
                            className='flex items-center justify-between bg-gray-200 rounded-md px-4 py-1'
                        >
                            <p>{plane}</p>
                        </div>
                    ))}
                </div>

                <div className='grid grid-cols-4 gap-4'>
                    {planeExemple.map((plane, index) => (
                        <Button
                            key={index}
                            className={`w-full justify-center text-left font-normal bg-gray-100 hover:bg-gray-200 rounded-md text-black ${sessionData.plane.includes(plane.name) && "bg-red-500"}`}
                            onClick={() => onClickPlane(plane.name)}
                        >
                            {plane.name}
                        </Button>
                    ))}
                </div>

                <DialogFooter>
                    <DialogClose>Cancel</DialogClose>
                    <Button>Enregistrer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewSession;
