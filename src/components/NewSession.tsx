'use client'

import React, { useState, useEffect } from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser'
// 1. IMPORT DE L'ENUM ET DU COMPOSANT
import { flight_sessions, planes, User, userRole, NatureOfTheft } from '@prisma/client'
import { toast } from "@/hooks/use-toast"
import { checkSessionDate, interfaceSessions, newSession } from '@/api/db/sessions'
import { fr } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from "@/components/ui/switch"
import { Label } from '@/components/ui/label'
import { IoIosWarning } from "react-icons/io"
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { CircularProgress } from "@nextui-org/progress"
import {
    PlusIcon,
    CalendarIcon,
    Clock,
    Plane,
    User as UserIcon,
    ArrowRight,
    ArrowDown,
    Presentation,
    CheckCircle2,
    Tag // Ajout d'icone pour le type
} from 'lucide-react'
import { Textarea } from './ui/textarea'
import { cn } from '@/lib/utils'
// IMPORT DU SELECTEUR CREE
import FlightNatureSelector from '@/components/FlightNatureSelector'

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

interface TimeSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (string | number)[];
    placeholder?: string;
}


const NewSession: React.FC<Props> = ({ display, setSessions, planesProp, usersProps }) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()

    // --- States Logic ---
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

    // 2. MISE A JOUR DU STATE INITIAL
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
        classes: Array.from(new Set(planesProp.map(plane => plane.classes))),
        comment: "",
        natureOfTheft: []
    });

    // --- Effects ---
    useEffect(() => {
        if (currentUser?.role === userRole.ADMIN) {
            setInstructors(usersProps.filter(user => user.role === userRole.INSTRUCTOR || user.role === userRole.OWNER || user.role === userRole.ADMIN))
        } else if (currentUser?.role === userRole.OWNER || currentUser?.role === userRole.MANAGER) {
            setInstructors(usersProps.filter(user => user.role === userRole.INSTRUCTOR || user.role === userRole.OWNER))
        } else {
            setInstructors(usersProps.filter(user => user.id === currentUser?.id))
        }
    }, [currentUser?.id, currentUser?.role, usersProps])

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
            const planeClasses = Array.from(
                new Set(
                    prev.planeId
                        .map(id => planesProp.find(p => p.id === id)?.classes)
                        .filter(Boolean)
                )
            );
            const allClasses = classroomSession
                ? Array.from(new Set([...planeClasses, 1, 2, 3, 4, 5, 6]))
                : planeClasses;

            return { ...prev, classes: allClasses as number[] };
        });
    }, [classroomSession, planesProp]);

    useEffect(() => {
        const startTime = new Date(1999, 0, 0, Number(sessionData.startHour), Number(sessionData.startMinute))
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + sessionData.duration)
        setSessionData(prev => ({ ...prev, endHour: String(endTime.getHours()), endMinute: endTime.getMinutes() === 0 ? "00" : String(endTime.getMinutes()) }))
    }, [sessionData.duration, sessionData.startHour, sessionData.startMinute])


    // --- Helpers ---
    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT) || currentUser?.role.includes(userRole.INSTRUCTOR) || currentUser?.role.includes(userRole.MANAGER))) {
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
            return { numberOfWeeks: 1, numberSessionsPerWeek: numberSessionsPerWeek, totalSessions: numberSessionsPerWeek };
        }
        const startDate = new Date(sessionData.date);
        const endDate = new Date(sessionData.endReccurence);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const numberOfWeeks = Math.ceil(diffDays / 7) + 1;
        const totalSessions = numberOfWeeks * numberSessionsPerWeek;
        return { numberOfWeeks, numberSessionsPerWeek, totalSessions };
    }

    function getNextSameDayOfWeek(date: Date, targetDayOfWeek: number): Date {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 7);
        while (nextDate.getDay() !== targetDayOfWeek) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
        return nextDate;
    }

    function splitSessions(sessionData: interfaceSessions): interfaceSessions[] {
        const stats = calculateSessionStats(sessionData);
        const maxSessionsPerInterface = 10;
        if (stats.totalSessions <= maxSessionsPerInterface) return [sessionData];
        if (!sessionData.date || !sessionData.endReccurence) throw new Error("Date and endReccurence must be defined to split sessions");

        const startDate = new Date(sessionData.date);
        const weeksPerPeriod = Math.floor(maxSessionsPerInterface / stats.numberSessionsPerWeek);
        const splitSessions: interfaceSessions[] = [];
        let currentStartDate = new Date(startDate);
        let remainingSessions = stats.totalSessions;
        const initialDayOfWeek = startDate.getDay();

        while (remainingSessions > 0) {
            const periodEndDate = new Date(currentStartDate);
            periodEndDate.setDate(periodEndDate.getDate() + weeksPerPeriod * 7 - 1);
            const finalEndDate = new Date(sessionData.endReccurence);
            const endDateForThisPeriod = periodEndDate < finalEndDate ? periodEndDate : finalEndDate;

            const newPeriod: interfaceSessions = {
                ...sessionData,
                date: new Date(currentStartDate),
                endReccurence: new Date(endDateForThisPeriod),
            };
            splitSessions.push(newPeriod);
            const currentStats = calculateSessionStats(newPeriod);
            remainingSessions -= currentStats.totalSessions;
            currentStartDate = getNextSameDayOfWeek(endDateForThisPeriod, initialDayOfWeek);
            if (currentStartDate >= finalEndDate) break;
        }
        return splitSessions;
    }

    const onClickPlane = (plane: planes) => {
        setSessionData(prev => {
            const isPlaneSelected = prev.planeId.includes(plane.id);
            const updatedPlaneId = isPlaneSelected
                ? prev.planeId.filter(p => p !== plane.id)
                : [...prev.planeId, plane.id];

            const planeClasses = Array.from(
                new Set(
                    updatedPlaneId
                        .map(id => planesProp.find(p => p.id === id)?.classes)
                        .filter(Boolean)
                )
            );
            const updatedClasses = classroomSession
                ? Array.from(new Set([...planeClasses, 1, 2, 3, 4, 5, 6]))
                : planeClasses;
            return { ...prev, planeId: updatedPlaneId, classes: updatedClasses as number[] };
        });
    };

    const onConfirm = async () => {
        setLoading(true);
        setError("");
        let successNewSessions = 0;

        if (!sessionData.date) {
            setError("Veuillez sélectionner une date");
            setLoading(false);
            return;
        }
        if (!classroomSession && sessionData.planeId.length === 0) {
            setError("Veuillez sélectionner au moins un avion");
            setLoading(false);
            return;
        }

        if (!classroomSession && sessionData.natureOfTheft.length === 0) {
            setError("Veuillez sélectionner au moins une nature de vol");
            setLoading(false);
            return;
        }

        try {
            const finalSessionData = {
                ...sessionData,
                planeId: classroomSession
                    ? [...sessionData.planeId, "classroomSession"]
                    : sessionData.planeId
            };
            const instructor = usersProps.find(user => user.id === sessionData.instructorId);

            const res = await checkSessionDate(finalSessionData, instructor);
            if (res?.error) {
                setError(res.error);
                setLoading(false);
                return;
            }

            const splitSessionsArray = splitSessions(finalSessionData);
            setTotalSessions(splitSessionsArray.length);

            for (const session of splitSessionsArray) {
                // S'assurer que la fonction newSession de l'API accepte bien le champ natureOfTheft
                const result = await newSession(session as any, instructor);
                if (result?.error) {
                    toast({
                        title: "Erreur",
                        description: result.error,
                        variant: "destructive",
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
                    title: "Succès !",
                    description: "Les sessions ont été créées.",
                    className: "bg-green-600 text-white border-none",
                });
                setIsPopoverOpen(false);
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur technique est survenue.");
        } finally {
            setLoading(false);
        }
    };

    const TimeSelect = ({ value, onChange, options, placeholder }: TimeSelectProps) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[70px] border-none shadow-none focus:ring-0 bg-transparent px-1 justify-center font-medium text-slate-700">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className='max-h-[200px]'>
                {options.map((o) => (
                    <SelectItem key={o} value={String(o)}>{o}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    return (
        <Dialog open={isOpenPopover} onOpenChange={setIsPopoverOpen}>
            <DialogTrigger asChild>
                {display === "desktop" ? (
                    <Button className='bg-[#774BBE] hover:bg-[#6538a5] text-white shadow-md gap-2 transition-colors'>
                        <PlusIcon className="w-4 h-4" />
                        Nouvelle session
                    </Button>
                ) : (
                    <div className='bg-[#774BBE] text-white flex h-full items-center justify-center px-3 py-2 rounded-lg shadow-lg hover:bg-[#6538a5] cursor-pointer transition-colors active:scale-95'>
                        <PlusIcon className="w-5 h-5" />
                    </div>
                )}
            </DialogTrigger>

            <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[85vh] p-0 gap-0 bg-white rounded-xl sm:rounded-2xl border-none shadow-2xl flex flex-col">
                <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 rounded-t-xl sm:rounded-t-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <div className="p-2 bg-[#774BBE]/10 rounded-lg">
                                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                            </div>
                            Nouvelle session
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 ml-11 text-xs sm:text-sm">
                            Planifiez un vol ou un cours théorique.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto flex-grow">
                    {/* Section 1: Qui et Quand */}
                    <div className="space-y-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Détails du vol</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Instructeur */}
                            <div className="space-y-2">
                                <Label className="text-slate-600 flex items-center gap-2 text-sm">
                                    <UserIcon className="w-4 h-4" /> Instructeur
                                </Label>
                                <Select
                                    value={sessionData.instructorId}
                                    onValueChange={(val) => setSessionData(prev => ({ ...prev, instructorId: val }))}
                                    disabled={
                                        currentUser?.role === userRole.USER ||
                                        currentUser?.role === userRole.PILOT ||
                                        currentUser?.role === userRole.INSTRUCTOR ||
                                        currentUser?.role === userRole.STUDENT
                                    }
                                >
                                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:ring-[#774BBE]">
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
                            <div className="space-y-2 flex flex-col">
                                <Label className="text-slate-600 flex items-center gap-2 text-sm">
                                    <CalendarIcon className="w-4 h-4" /> Date
                                </Label>
                                <div className="relative w-full">
                                    <DatePicker
                                        onInputClick={() => setIsOpenCal1(true)}
                                        onSelect={() => setIsOpenCal1(false)}
                                        open={isOpenCal1}
                                        readOnly
                                        selected={sessionData.date}
                                        onChange={(date) => {
                                            if (!date) setSessionData((prev) => ({ ...prev, date: undefined }))
                                            else setSessionData((prev) => ({ ...prev, date: new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), date!.getUTCHours(), date!.getUTCMinutes(), 0) }))
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="Sélectionner une date"
                                        wrapperClassName="w-full"
                                        className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#774BBE] focus-visible:ring-offset-2"
                                        todayButton="Aujourd'hui"
                                        locale={fr}
                                        isClearable
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. INTEGRATION DU SELECTEUR DE TYPE DE VOL */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 flex items-center gap-2 text-sm">
                                <Tag className="w-4 h-4" /> Nature du vol
                            </Label>
                            <FlightNatureSelector
                                selectedNatures={sessionData.natureOfTheft}
                                onChange={(natures) => setSessionData(prev => ({ ...prev, natureOfTheft: natures }))}
                            />
                        </div>

                        {/* Horaires */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4" /> Créneau horaire
                            </Label>

                            {/* Conteneur Parent : Transparent, gère l'espacement et l'alignement */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">

                                {/* BLOC 1 : HEURE DE DÉBUT (Gris avec bordure) */}
                                <div className="flex items-center justify-center w-full sm:w-auto p-1 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                    <span className="text-xs text-slate-400 ml-2 mr-1 sm:hidden">Début</span>
                                    <TimeSelect
                                        value={sessionData.startHour}
                                        onChange={(v: string) => setSessionData(prev => ({ ...prev, startHour: v }))}
                                        options={currentClub?.HoursOn || []}
                                    />
                                    <span className="text-slate-400 font-bold mx-0.5">:</span>
                                    <TimeSelect
                                        value={sessionData.startMinute}
                                        onChange={(v: string) => setSessionData(prev => ({ ...prev, startMinute: v }))}
                                        options={["00"]}
                                    />
                                </div>

                                {/* ÉLÉMENT CENTRAL : FLÈCHE (Fond blanc/transparent) */}
                                <div className="text-slate-300 flex-shrink-0">
                                    <ArrowRight className="w-5 h-5 hidden sm:block" />
                                    <ArrowDown className="w-5 h-5 block sm:hidden" />
                                </div>

                                {/* BLOC 2 : HEURE DE FIN (Gris avec bordure) */}
                                <div className="flex items-center justify-center w-full sm:w-auto p-1 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                    <span className="text-xs text-slate-400 ml-2 mr-1 sm:hidden">Fin</span>
                                    <TimeSelect
                                        value={sessionData.endHour}
                                        onChange={(v: string) => setSessionData(prev => ({ ...prev, endHour: v }))}
                                        options={currentClub?.HoursOn || []}
                                    />
                                    <span className="text-slate-400 font-bold mx-0.5">:</span>
                                    <TimeSelect
                                        value={sessionData.endMinute}
                                        onChange={(v: string) => setSessionData(prev => ({ ...prev, endMinute: v }))}
                                        options={["00"]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 2: Contexte et Appareils */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">Ressources</h3>
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                <span className={cn("text-[10px] sm:text-xs font-medium px-2 py-1 rounded transition-all", !classroomSession ? "bg-white shadow text-[#774BBE]" : "text-slate-500")}>Vol</span>
                                <Switch
                                    id="classroomSessions"
                                    checked={classroomSession}
                                    onCheckedChange={setClassroomSession}
                                    className="data-[state=checked]:bg-[#774BBE] scale-90 sm:scale-100"
                                />
                                <span className={cn("text-[10px] sm:text-xs font-medium px-2 py-1 rounded transition-all", classroomSession ? "bg-white shadow text-[#774BBE]" : "text-slate-500")}>Salle</span>
                            </div>
                        </div>

                        {!classroomSession && (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-slate-600 text-sm">Sélectionner les appareils</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleSelectAllPlanes}
                                        className="text-xs text-[#774BBE] hover:text-[#6538a5] h-auto p-0 hover:bg-transparent"
                                    >
                                        {allPlanesSelected ? "Tout désélectionner" : "Tout sélectionner"}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {planesProp?.map((plane) => {
                                        const isSelected = sessionData.planeId.includes(plane.id);
                                        return (
                                            <button
                                                key={plane.id}
                                                onClick={() => onClickPlane(plane)}
                                                className={cn(
                                                    "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ease-in-out group touch-manipulation",
                                                    isSelected
                                                        ? "border-[#774BBE] bg-[#774BBE]/5"
                                                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-full mb-2 transition-colors",
                                                    isSelected ? "bg-[#774BBE] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                                )}>
                                                    <Plane className="w-4 h-4" />
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-semibold truncate w-full text-center",
                                                    isSelected ? "text-[#774BBE]" : "text-slate-600"
                                                )}>{plane.name}</span>

                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 text-[#774BBE]">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {classroomSession && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
                                <Presentation className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-medium">Cette session se déroulera en salle de cours (pas d&apos;appareil requis).</p>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Section 3: Options avancées */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="recurrence"
                                checked={switchRecurrence}
                                onCheckedChange={setSwitchRecurrence}
                                className="data-[state=checked]:bg-[#774BBE] scale-90 sm:scale-100"
                            />
                            <Label htmlFor="recurrence" className="cursor-pointer text-sm">Répéter cette session chaque semaine</Label>
                        </div>

                        {switchRecurrence && (
                            <div className="pl-12 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="endRecurrence" className="mb-2 block text-xs text-slate-500 uppercase">Jusqu&apos;au</Label>
                                <div className="relative max-w-[200px]">
                                    <DatePicker
                                        onInputClick={() => setIsOpenCal2(true)}
                                        onSelect={() => setIsOpenCal2(false)}
                                        open={isOpenCal2}
                                        selected={sessionData.endReccurence}
                                        onChange={(endReccurence) => {
                                            if (!endReccurence) setSessionData((prev) => ({ ...prev, endReccurence: undefined }))
                                            else setSessionData((prev) => ({ ...prev, endReccurence: new Date(endReccurence!.getFullYear(), endReccurence!.getMonth(), endReccurence!.getDate(), endReccurence!.getUTCHours(), endReccurence!.getUTCMinutes(), 0) }))
                                        }}
                                        dateFormat="dd/MM/yyyy"
                                        placeholderText="Date de fin"
                                        className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:ring-[#774BBE]"
                                        todayButton="Aujourd'hui"
                                        locale={fr}
                                        isClearable
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-slate-600 text-sm">Note (optionnel)</Label>
                            <Textarea
                                value={sessionData.comment}
                                onChange={(e) => setSessionData(prev => ({ ...prev, comment: e.target.value }))}
                                className="bg-slate-50 border-slate-200 focus:border-[#774BBE] min-h-[80px] text-sm"
                                placeholder="Instructions pour les élèves, plan de vol..."
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex flex-col gap-4 flex-shrink-0 rounded-b-xl sm:rounded-b-2xl">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                            <IoIosWarning className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row justify-end gap-3 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsPopoverOpen(false)}
                            disabled={loading}
                            className="text-slate-500 hover:text-slate-700 hover:bg-slate-200 w-full sm:w-auto"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={loading}
                            className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:min-w-[140px] sm:w-auto"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <CircularProgress
                                        aria-label="Chargement"
                                        size="sm"
                                        value={(100 * stateLoading / totalSessions) || 0}
                                        classNames={{
                                            svg: "w-4 h-4 text-white",
                                            indicator: "stroke-white",
                                            track: "stroke-white/30",
                                        }}
                                    />
                                    <span>Création...</span>
                                </div>
                            ) : "Enregistrer la session"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default NewSession