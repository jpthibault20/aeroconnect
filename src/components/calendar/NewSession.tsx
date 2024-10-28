import React, { useState, useEffect } from 'react';
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
import { FaArrowRightLong, FaCheck } from "react-icons/fa6";
import { planeExemple } from '@/config/configClub';
import { Switch } from "@/components/ui/switch";
import { RxCross2 } from "react-icons/rx";

interface Props {
    display: string;
    style?: string;
}
// début de composant
const NewSession = ({ display }: Props) => {
    // récupération de l'utilisateur courant
    const { currentUser } = useCurrentUser();

    // initialisation des variables
    const [isOpenCal1, setIsOpenCal1] = useState(false);
    const [isOpenCal2, setIsOpenCal2] = useState(false);
    const [switchReccurence, setSwitchReccurence] = useState(false);
    const [sessionData, setSessionData] = useState<{
        date: Date | undefined;
        startHour: string;
        startMinute: string;
        endHour: string;
        endMinute: string;
        endReccurence: Date | undefined;
        planeId: number[];
    }>({
        date: undefined,
        startHour: "9",
        startMinute: "00",
        endHour: "11",
        endMinute: "00",
        endReccurence: undefined,
        planeId: [],
    });

    // Calul de la date de fin de reccurence en fonction de la date de début avec 1 semaine de plus (delais minimum)
    useEffect(() => {
        if (switchReccurence && sessionData.date) {
            const dateStart = new Date(sessionData.date!.getFullYear(), sessionData.date!.getMonth(), sessionData.date!.getDate())
            const dateEnd = new Date(dateStart)
            dateEnd.setDate(dateStart.getDate() + 14)
            setSessionData(prev => ({ ...prev, endReccurence: dateEnd }))
        }
    }, [switchReccurence, sessionData.date])

    // Calcul de l'heure de fin par défault en fonction de l'heure de début
    useEffect(() => {
        const startTime = new Date(1999, 0, 0, Number(sessionData.startHour), Number(sessionData.startMinute))
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + sessionDurationMin)
        setSessionData(prev => ({ ...prev, endHour: String(endTime.getHours()), endMinute: endTime.getMinutes() === 0 ? "00" : String(endTime.getMinutes()) }))
    }, [sessionData.startHour, sessionData.startMinute])

    // si l'utilisateur n'as pas le bon role il ne pourras pas voir cette page de création de session
    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT))) {
        return null;
    }

    // permet de verifier si tous les avions sont séléctioné ou pas boolean variable
    const allPlanesSelected = planeExemple.length === sessionData.planeId.length;

    // fonction permettant de sélectionner un avion pour l'affichage dans la liste des avions
    const onClickPlane = (plane: number) => {
        setSessionData(prev => ({
            ...prev,
            planeId: prev.planeId.includes(plane)
                ? prev.planeId.filter(p => p !== plane)
                : [...prev.planeId, plane]
        }));
    };

    // fonction permettant de séléctionner ou non tous les avions
    const toggleSelectAllPlanes = () => {
        setSessionData(prev => ({
            ...prev,
            planeId: allPlanesSelected ? [] : planeExemple.map(p => p.id)
        }));
    };

    // affichage du composant(bouton de nouvelle session et card de configuration)
    return (
        <Dialog>
            <DialogTrigger className={`${display === "desktop" ? "bg-[#774BBE] hover:bg-[#3d2365] text-white" : "bg-white"} rounded-md px-2 font-medium`}>
                {display === "desktop" ? <p>Nouvelle session</p> : <IoMdAddCircle size={27} color='#774BBE' />}
            </DialogTrigger>
            <DialogContent className='bg-[#ffffff] max-h-screen overflow-y-auto'>
                <DialogHeader className='flex flex-col items-center mb-3'>
                    <DialogTitle>Nouvelle session</DialogTitle>
                    <DialogDescription>Configuration de la nouvelle session</DialogDescription>
                </DialogHeader>

                <Label>Date de la session</Label>
                <Popover open={isOpenCal1} onOpenChange={setIsOpenCal1}>
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
                            onSelect={(date) => {
                                setSessionData(prev => ({ ...prev, date }))
                                setIsOpenCal1(false)
                            }}
                            initialFocus
                            locale={fr}
                        />
                    </PopoverContent>
                </Popover>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <Select value={sessionData.startHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, startHour: value }))}>
                            <SelectTrigger className="w-[65px] bg-white">
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
                            <SelectTrigger className="w-[65px] bg-white">
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

                    <FaArrowRightLong color="black" size={20} />

                    <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <Select value={sessionData.endHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, endHourHour: value }))}>
                            <SelectTrigger className="w-[65px] bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {workingHour.map((h) => (
                                    <SelectItem key={`end-${h}`} value={h.toString()}>
                                        {h}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p>h</p>
                        <Select value={sessionData.endMinute} onValueChange={(value) => setSessionData(prev => ({ ...prev, endMinute: value }))}>
                            <SelectTrigger className="w-[65px] bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {minutes.map((m) => (
                                    <SelectItem key={`end-${m}`} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Label>Avion(s)</Label>
                <div className='w-full h-fit min-h-10 border border-gray-200 rounded-md shadow-sm flex flex-wrap p-2 gap-2 bg-gray-100'>
                    {sessionData.planeId.map((plane, index) => (
                        <div
                            key={index}
                            className='flex items-center justify-between bg-gray-200 rounded-md px-4 py-1'
                        >
                            {/* récupération du nom de l'avion à partir de l'id */}
                            <p>{planeExemple.find(p => p.id === plane)?.name}</p>
                        </div>
                    ))}
                </div>
                <div className='grid grid-cols-3 gap-4'>
                    <Button
                        className={`w-full justify-center text-left font-normal ${allPlanesSelected ? "bg-red-500" : "bg-gray-200 "} rounded-md text-black hover:bg-gray-300`}
                        onClick={toggleSelectAllPlanes}
                    >
                        {allPlanesSelected ? "Effacer" : "Tous"}
                    </Button>
                    {planeExemple.map((plane, index) => (
                        <Button
                            key={index}
                            className={`w-full justify-center text-left border border-gray-200 font-normal bg-gray-200 hover:bg-gray-300 rounded-md text-black ${sessionData.planeId.includes(plane.id) && "bg-red-500"}`}
                            onClick={() => onClickPlane(plane.id)}
                        >
                            {plane.name}
                        </Button>
                    ))}
                </div>

                <Label>Récurrence</Label>
                <div className='flex items-center justify-between '>
                    <p>Répéter cette session chaque semaine</p>
                    <div className='flex items-center space-x-2'>
                        <RxCross2 color='red' />
                        <Switch onCheckedChange={() => setSwitchReccurence(!switchReccurence)} checked={switchReccurence} />
                        <FaCheck color='green' />
                    </div>
                </div>

                {switchReccurence && (
                    <div className='flex flex-col space-y-3'>
                        <Label>Date de la dernière session</Label>
                        <Popover open={isOpenCal2} onOpenChange={setIsOpenCal2}>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("justify-start text-left font-normal", !sessionData.date && "text-muted-foreground")}>
                                    <CalendarIcon />
                                    {sessionData.endReccurence ? format(sessionData.endReccurence, "PPP", { locale: fr }) : <span>Sélectionnez une date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Calendar
                                    key={sessionData?.endReccurence?.toISOString()}
                                    mode="single"
                                    selected={sessionData?.endReccurence}
                                    defaultMonth={sessionData?.endReccurence || undefined}
                                    onSelect={(date) => {
                                        setSessionData(prev => ({ ...prev, endReccurence: date }))
                                        setIsOpenCal2(false)
                                    }}
                                    initialFocus
                                    locale={fr}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                <DialogFooter className='mt-3'>
                    <DialogClose>Cancel</DialogClose>
                    <Button>Enregistrer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NewSession;
