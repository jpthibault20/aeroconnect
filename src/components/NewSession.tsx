'use client'

import React, { useState, useEffect } from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { flight_sessions, planes, User, userRole } from '@prisma/client'
import { toast } from "@/hooks/use-toast"
import { checkSessionDate, interfaceSessions, newSession } from '@/api/db/sessions'
import { fr } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from "@/components/ui/switch"
import { Label } from '@/components/ui/label'
import { FaPlus } from "react-icons/fa6";
import { IoIosWarning } from "react-icons/io"
import { FaArrowRightLong } from "react-icons/fa6"
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { CircularProgress } from "@nextui-org/progress"
import { PlusIcon } from 'lucide-react'


interface Props {
    display: "desktop" | "phone"
    style?: string
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>
    planesProp: planes[]
    usersProps: User[]
}

interface SessionStats {
    numberOfWeeks: number;
    numberSessionsPerWeek: number;
    totalSessions: number;
}

const NewSession: React.FC<Props> = ({ display, setSessions, planesProp, usersProps }) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [isOpenPopover, setIsPopoverOpen] = useState(false)
    const [isOpenCal1, setIsOpenCal1] = useState(false)
    const [isOpenCal2, setIsOpenCal2] = useState(false)
    const [switchRecurrence, setSwitchRecurrence] = useState(false)
    const [classroomSession, setClassroomSession] = useState(false)
    const [stateLoading, setStateLoading] = useState(0)
    const [totalSessions, setTotalSessions] = useState(0)
    const [instructors, setInstructors] = useState<User[]>([])
    const [sessionData, setSessionData] = useState<interfaceSessions>({
        instructorId: currentUser?.id as string,
        date: undefined,
        startHour: "9",
        startMinute: "00",
        endHour: "11",
        endMinute: "00",
        duration: currentClub?.SessionDurationMin || 60,
        endReccurence: undefined,
        planeId: planesProp.map(plane => plane.id),
        classes: Array.from(new Set(planesProp.map(plane => plane.classes)))
    });

    useEffect(() => {
        if (currentUser?.role === userRole.ADMIN){
            setInstructors(usersProps.filter(user => user.role === userRole.INSTRUCTOR || user.role === userRole.OWNER || user.role === userRole.ADMIN))
        }
        else if (currentUser?.role === userRole.OWNER){
            setInstructors(usersProps.filter(user => user.role === userRole.INSTRUCTOR || user.role === userRole.OWNER))
        }
        else{
            setInstructors(usersProps.filter(user => user.id === currentUser?.id))
        }
    },[currentUser?.id, currentUser?.role, usersProps])

    useEffect(() => {
        if (!switchRecurrence) setSessionData(prev => ({ ...prev, endReccurence: undefined }))
        if (switchRecurrence && sessionData.date) {
            const dateStart = new Date(sessionData.date.getFullYear(), sessionData.date.getMonth(), sessionData.date.getDate())
            const dateEnd = new Date(dateStart)
            dateEnd.setDate(dateStart.getDate() + 7)
            setSessionData(prev => ({ ...prev, endReccurence: dateEnd }))
        }
    }, [switchRecurrence, sessionData.date])

    useEffect(() => {
        setSessionData(prev => {
            // Récupérer toutes les classes uniques des avions sélectionnés
            const planeClasses = Array.from(
                new Set(
                    prev.planeId
                        .map(id => planesProp.find(p => p.id === id)?.classes)
                        .filter(Boolean)
                )
            );

            // Si mode salle, ajouter toutes les classes (1-6)
            const allClasses = classroomSession
                ? Array.from(new Set([...planeClasses, 1, 2, 3, 4, 5, 6]))
                : planeClasses;

            return {
                ...prev,
                classes: allClasses as number[]
            };
        });
    }, [classroomSession, planesProp]);

    useEffect(() => {
        const startTime = new Date(1999, 0, 0, Number(sessionData.startHour), Number(sessionData.startMinute))
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + sessionData.duration)
        setSessionData(prev => ({ ...prev, endHour: String(endTime.getHours()), endMinute: endTime.getMinutes() === 0 ? "00" : String(endTime.getMinutes()) }))
    }, [sessionData.duration, sessionData.startHour, sessionData.startMinute])


    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT) || currentUser?.role.includes(userRole.INSTRUCTOR))) {
        return null
    }

    const allPlanesSelected = planesProp?.length === sessionData.planeId.length



    const toggleSelectAllPlanes = () => {
        setSessionData(prev => ({
            ...prev,
            planeId: allPlanesSelected ? [] : planesProp!.map(p => p.id)
        }))
    }

    function calculateSessionStats(sessionData: interfaceSessions): SessionStats {

        const sessionDurationMinutes = (parseInt(sessionData.endHour) - parseInt(sessionData.startHour)) * 60 +
            (parseInt(sessionData.endMinute) - parseInt(sessionData.startMinute));

        const numberSessionsPerWeek = Math.ceil(sessionDurationMinutes / sessionData.duration);

        if (!sessionData.date || !sessionData.endReccurence) {
            return {
                numberOfWeeks: 1,
                numberSessionsPerWeek: numberSessionsPerWeek,
                totalSessions: numberSessionsPerWeek
            };
        }

        const startDate = new Date(sessionData.date);
        const endDate = new Date(sessionData.endReccurence);

        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const numberOfWeeks = Math.ceil(diffDays / 7) + 1;
        const totalSessions = numberOfWeeks * numberSessionsPerWeek;

        return {
            numberOfWeeks,
            numberSessionsPerWeek,
            totalSessions
        };
    }

    function getNextSameDayOfWeek(date: Date, targetDayOfWeek: number): Date {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 7); // Passe au jour suivant

        while (nextDate.getDay() !== targetDayOfWeek) {
            nextDate.setDate(nextDate.getDate() + 1);
        }

        return nextDate;
    }

    function splitSessions(sessionData: interfaceSessions): interfaceSessions[] {
        const stats = calculateSessionStats(sessionData);

        const maxSessionsPerInterface = 10;

        if (stats.totalSessions <= maxSessionsPerInterface) {
            return [sessionData];
        }

        if (!sessionData.date || !sessionData.endReccurence) {
            console.error("Erreur: Dates non définies");
            throw new Error("Date and endReccurence must be defined to split sessions");
        }

        const startDate = new Date(sessionData.date);
        const weeksPerPeriod = Math.floor(maxSessionsPerInterface / stats.numberSessionsPerWeek);

        const splitSessions: interfaceSessions[] = [];
        let currentStartDate = new Date(startDate);
        let remainingSessions = stats.totalSessions;
        const initialDayOfWeek = startDate.getDay(); // Récupère le jour de la semaine initial

        while (remainingSessions > 0) {
            // Calculer la fin de la période actuelle
            const periodEndDate = new Date(currentStartDate);
            periodEndDate.setDate(periodEndDate.getDate() + weeksPerPeriod * 7 - 1);

            const finalEndDate = new Date(sessionData.endReccurence);
            const endDateForThisPeriod = periodEndDate < finalEndDate ? periodEndDate : finalEndDate;

            // Créer une nouvelle période
            const newPeriod: interfaceSessions = {
                ...sessionData,
                date: new Date(currentStartDate),
                endReccurence: new Date(endDateForThisPeriod),
            };

            splitSessions.push(newPeriod);

            const currentStats = calculateSessionStats(newPeriod);
            remainingSessions -= currentStats.totalSessions;

            // Définir le début de la prochaine période
            currentStartDate = getNextSameDayOfWeek(endDateForThisPeriod, initialDayOfWeek);

            if (currentStartDate >= finalEndDate) {
                break;
            }
        }

        return splitSessions;
    }

    const onClickPlane = (plane: planes) => {
        setSessionData(prev => {
            const isPlaneSelected = prev.planeId.includes(plane.id);
            const updatedPlaneId = isPlaneSelected
                ? prev.planeId.filter(p => p !== plane.id)
                : [...prev.planeId, plane.id];

            // Récupérer les classes des avions sélectionnés
            const planeClasses = Array.from(
                new Set(
                    updatedPlaneId
                        .map(id => planesProp.find(p => p.id === id)?.classes)
                        .filter(Boolean)
                )
            );

            // Si mode salle, garder toutes les classes (1-6)
            const updatedClasses = classroomSession
                ? Array.from(new Set([...planeClasses, 1, 2, 3, 4, 5, 6]))
                : planeClasses;

            return {
                ...prev,
                planeId: updatedPlaneId,
                classes: updatedClasses as number[],
            };
        });
    };

    const onConfirm = async () => {
        setLoading(true);
        let successNewSessions = 0;

        if (!sessionData.date) {
            setError("Veuillez sélectionner une date");
            setLoading(false);
            return;
        }

        // Valider qu'il y a soit des avions sélectionnés soit une session en salle
        if (!classroomSession && sessionData.planeId.length === 0) {
            setError("Veuillez sélectionner au moins un avion");
            setLoading(false);
            return;
        }

        try {
            // Préparer les données de session
            const finalSessionData = {
                ...sessionData,
                planeId: classroomSession
                    ? [...sessionData.planeId, "classroomSession"]
                    : sessionData.planeId
            };

            const res = await checkSessionDate(finalSessionData, currentUser);
            if (res?.error) {
                setError(res.error);
                setLoading(false);
                return;
            }

            const splitSessionsArray = splitSessions(finalSessionData);
            setTotalSessions(splitSessionsArray.length);

            for (const session of splitSessionsArray) {
                const result = await newSession(session, currentUser);
                if (result?.error) {
                    toast({
                        title: result.error,
                        duration: 5000,
                        style: { background: '#ab0b0b', color: '#fff' },
                    });
                    setLoading(false);
                    return;
                }

                if (result?.success && result?.sessions) {
                    setSessions(prev => [...prev, ...result.sessions]);
                    successNewSessions++;
                    setStateLoading(prev => prev + 1);
                }
            }

            if (successNewSessions === splitSessionsArray.length) {
                toast({
                    title: "Les sessions ont été créées !",
                    duration: 5000,
                    style: { background: '#0bab15', color: '#fff' },
                });
                setIsPopoverOpen(false);
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi des données :", error);
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpenPopover} onOpenChange={setIsPopoverOpen}>
            <DialogTrigger
                aria-label="Ouvrir le formulaire de nouvelle session"
                className='h-full flex items-center justify-center'
            >
                {display === "desktop" ? (
                    <div className='bg-[#774BBE] text-white flex items-center justify-center gap-2 px-2 h-full rounded-lg shadow-md hover:bg-[#6538a5] cursor-pointer transition'>
                        <PlusIcon />
                        <p>Nouvelle session</p>
                    </div>
                )
                    :
                    <div className='bg-[#774BBE] text-white flex h-full items-center justify-center px-3 py-2 rounded-lg shadow-lg hover:bg-[#6538a5] cursor-pointer transition'>
                        <FaPlus />
                    </div>
                }
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] lg:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Nouvelle session</DialogTitle>
                    <DialogDescription>Configuration de la nouvelle session</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Instructor */}
                    <div className='grid gap-2'>
                        <Label htmlFor="instructor">Instructeur</Label>
                        <Select 
                            value={sessionData.instructorId} 
                            onValueChange={(val) => setSessionData(prev => ({ ...prev, instructorId: val }))}
                            disabled={currentUser?.role !== (userRole.ADMIN || userRole.OWNER)}
                        >
                            <SelectTrigger className="">
                                <SelectValue placeholder="Instructeurs" />
                            </SelectTrigger>
                            <SelectContent>
                                {instructors.map((item, index) => (
                                    <SelectItem key={index} value={item.id}>
                                        {item.firstName} {item.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Date */}
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker
                            onInputClick={() => setIsOpenCal1(true)}
                            onSelect={() => setIsOpenCal1(false)}
                            open={isOpenCal1}
                            readOnly
                            showIcon
                            selected={sessionData.date}
                            onChange={(date) => {
                                if (!date) setSessionData((prev) => ({ ...prev, date: undefined }))
                                else setSessionData((prev) => ({ ...prev, date: new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), date!.getUTCHours(), date!.getUTCMinutes(), 0) }))
                            }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Select a date"
                            className="w-full p-2 text-base border border-gray-300 rounded-md"
                            todayButton="Aujourd'hui"
                            locale={fr}
                            isClearable
                        />
                    </div>

                    {/* Hours */}
                    <div className="grid gap-2">
                        <Label>Horaires</Label>
                        <div className="flex items-center space-x-2">
                            <Select value={sessionData.startHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, startHour: value }))}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className='h-[40vh] overflow-y-auto'>
                                    {currentClub?.HoursOn.map((h) => (
                                        <SelectItem key={`start-${h}`} value={String(h)}>
                                            {h}
                                        </SelectItem>
                                    ))}

                                </SelectContent>
                            </Select>
                            <span>:</span>
                            <Select value={sessionData.startMinute} onValueChange={(value) => setSessionData(prev => ({ ...prev, startMinute: value }))}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {["00"].map((m) => (
                                        <SelectItem key={`start-${m}`} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FaArrowRightLong className="mx-2" />
                            <Select value={sessionData.endHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, endHour: value }))}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className='h-[40vh] overflow-y-auto'>
                                    {currentClub?.HoursOn.map((h) => (
                                        <SelectItem key={`end-${h}`} value={h.toString()}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span>:</span>
                            <Select value={sessionData.endMinute} onValueChange={(value) => setSessionData(prev => ({ ...prev, endMinute: value }))}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {["00"].map((m) => (
                                        <SelectItem key={`end-${m}`} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="recurrence">Session en salle</Label>
                        <Switch
                            id="classroomSessions"
                            checked={classroomSession}
                            onCheckedChange={setClassroomSession}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Appareils</Label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                aria-label={`${allPlanesSelected ? "Désélectionner" : "Sélectionner"} tous les appareils`}
                                variant={allPlanesSelected ? "destructive" : "outline"}
                                size="sm"
                                onClick={toggleSelectAllPlanes}
                            >
                                {allPlanesSelected ? "Désélectionner tout" : "Sélectionner tout"}
                            </Button>
                            {planesProp?.map((plane) => (
                                <Button
                                    aria-label={`${sessionData.planeId.includes(plane.id) ? "Désélectionner" : "Sélectionner"} l'appareil ${plane.name}`}
                                    key={plane.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onClickPlane(plane)}
                                    className={`${sessionData.planeId.includes(plane.id) ? "bg-green-200 hover:bg-green-200" : "bg-red-200 text-gray-500 hover:bg-red-200 hover:text-gray-500"}`}
                                >
                                    {plane.name}
                                </Button>

                            ))}
                        </div>
                    </div>


                    <div className="flex items-center justify-between">
                        <Label htmlFor="recurrence">Récurrence hebdomadaire</Label>
                        <Switch
                            id="recurrence"
                            checked={switchRecurrence}
                            onCheckedChange={setSwitchRecurrence}
                        />
                    </div>
                    {switchRecurrence && (
                        <div className="grid gap-2">
                            <Label htmlFor="endRecurrence">Date de fin de récurrence</Label>

                            <DatePicker
                                onInputClick={() => setIsOpenCal2(true)}
                                onSelect={() => setIsOpenCal2(false)}
                                open={isOpenCal2}
                                showIcon
                                selected={sessionData.endReccurence}
                                onChange={(endReccurence) => {
                                    if (!endReccurence) setSessionData((prev) => ({ ...prev, endReccurence: undefined }))
                                    else setSessionData((prev) => ({ ...prev, endReccurence: new Date(endReccurence!.getFullYear(), endReccurence!.getMonth(), endReccurence!.getDate(), endReccurence!.getUTCHours(), endReccurence!.getUTCMinutes(), 0) }))
                                }}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Select a date"
                                className="w-full p-2 text-base border border-gray-300 rounded-md"
                                todayButton="Aujourd'hui"
                                locale={fr}
                                isClearable
                                readOnly
                            />
                        </div>
                    )}
                </div>
                {error && (
                    <div className="flex items-center text-destructive mb-4">
                        <IoIosWarning className="mr-2" />
                        <span>{error}</span>
                    </div>
                )}
                <DialogFooter className='w-full'>
                    <span className='flex flex-row items-center justify-end'>
                        <span>
                            <Button variant="link" aria-label='Annuler' onClick={() => setIsPopoverOpen(false)} className='w-fit text-gray-500' disabled={loading}>
                                Annuler
                            </Button>
                        </span>
                        <span>
                            <Button variant="perso" onClick={onConfirm} disabled={loading} className='w-fit' aria-label='Enregistrer la session'>
                                {loading ? (
                                    <CircularProgress
                                        showValueLabel={true}
                                        aria-label='Chargement des sessions'
                                        color='secondary'
                                        size="sm"
                                        value={(100 * stateLoading / totalSessions) || 0}
                                    />
                                ) : "Enregistrer"}
                            </Button>
                        </span>
                    </span>

                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default NewSession

