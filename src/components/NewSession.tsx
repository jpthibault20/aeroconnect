'use client'

import React, { useState, useEffect } from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { Club, flight_sessions, planes, userRole } from '@prisma/client'
import { useToast } from "@/hooks/use-toast"
import { getClub } from '@/api/db/club'
import { interfaceSessions, newSession } from '@/api/db/sessions'
import { sessionDurationMin } from '@/config/configClub'
import { fr } from "date-fns/locale"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from "@/components/ui/switch"
import { Label } from '@/components/ui/label'

import { IoMdAddCircle } from "react-icons/io"
import { IoIosWarning } from "react-icons/io"
import { FaArrowRightLong } from "react-icons/fa6"
import { CalendarIcon } from 'lucide-react'

interface Props {
    display: "desktop" | "phone"
    style?: string
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>
    planesProp: planes[]
}

const NewSession: React.FC<Props> = ({ display, setSessions, planesProp }) => {
    const { currentUser } = useCurrentUser()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [warning, setWarning] = useState("")
    const [isOpenPopover, setIsPopoverOpen] = useState(false)
    const [isOpenCal1, setIsOpenCal1] = useState(false)
    const [isOpenCal2, setIsOpenCal2] = useState(false)
    const [switchRecurrence, setSwitchRecurrence] = useState(false)
    const [club, setClub] = useState<Club>()
    const [sessionData, setSessionData] = useState<interfaceSessions>({
        date: undefined,
        startHour: "9",
        startMinute: "00",
        endHour: "11",
        endMinute: "00",
        duration: sessionDurationMin,
        endReccurence: undefined,
        planeId: planesProp.map(plane => plane.id)
    })

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
        const startTime = new Date(1999, 0, 0, Number(sessionData.startHour), Number(sessionData.startMinute))
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + sessionDurationMin)
        setSessionData(prev => ({ ...prev, endHour: String(endTime.getHours()), endMinute: endTime.getMinutes() === 0 ? "00" : String(endTime.getMinutes()) }))
    }, [sessionData.startHour, sessionData.startMinute])

    useEffect(() => {
        setWarning(sessionData.planeId.length === 0 ? "Attention, aucun avion n'a été sélectionné" : "")
    }, [sessionData.planeId])

    useEffect(() => {
        const getClubAPI = async () => {
            const clubData = await getClub(currentUser?.clubID as string)
            if (clubData) setClub(clubData)
        }
        getClubAPI()
    }, [currentUser?.clubID])

    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT) || currentUser?.role.includes(userRole.INSTRUCTOR))) {
        return null
    }

    const allPlanesSelected = planesProp?.length === sessionData.planeId.length

    const onClickPlane = (plane: string) => {
        setSessionData(prev => ({
            ...prev,
            planeId: prev.planeId.includes(plane)
                ? prev.planeId.filter(p => p !== plane)
                : [...prev.planeId, plane]
        }))
    }

    const toggleSelectAllPlanes = () => {
        setSessionData(prev => ({
            ...prev,
            planeId: allPlanesSelected ? [] : planesProp!.map(p => p.id)
        }))
    }

    const onConfirm = async () => {
        setLoading(true)
        try {
            const res = await newSession(sessionData, currentUser)
            if (res?.error) {
                setError(res.error)
            } else if (res?.success) {
                if (res?.sessions && Array.isArray(res.sessions)) {
                    setSessions((prev) => [...prev, ...res.sessions])
                }
                setError("")
                toast({ title: res.success, duration: 5000 })
                setIsPopoverOpen(false)
            } else {
                setError("Une erreur est survenue (E_002: réponse inattendue du serveur)")
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi des données :", error)
            setError("Une erreur est survenue lors de l'envoi des données.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpenPopover} onOpenChange={setIsPopoverOpen}>
            <DialogTrigger
                className={`${display === "desktop" ? "bg-[#774BBE] hover:bg-[#3d2365] text-white" : ""} h-full rounded-md px-2 font-medium`}
            >
                {display === "desktop" ? <p>Nouvelle session</p> : <IoMdAddCircle size={27} color="#774BBE" />}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] lg:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Nouvelle session</DialogTitle>
                    <DialogDescription>Configuration de la nouvelle session</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover open={isOpenCal1} onOpenChange={setIsOpenCal1}>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={`w-full justify-start text-left font-normal ${!sessionData.date && "text-muted-foreground"}`}
                                    onClick={() => setIsOpenCal1(true)}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {sessionData.date ? sessionData.date.toLocaleDateString() : "Choisir une date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={sessionData.date}
                                    onSelect={(date) => {
                                        setSessionData((prev) => ({ ...prev, date }))
                                        setIsOpenCal1(false)
                                    }}
                                    initialFocus
                                    locale={fr}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label>Horaires</Label>
                        <div className="flex items-center space-x-2">
                            <Select value={sessionData.startHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, startHour: value }))}>
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {club?.HoursOn.slice(0, -1).map((h) => (
                                        <SelectItem key={`start-${h}`} value={h.toString()}>{h}</SelectItem>
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
                                <SelectContent>
                                    {club?.HoursOn.map((h) => (
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
                    <div className="grid gap-2">
                        <Label>Avions</Label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={allPlanesSelected ? "destructive" : "outline"}
                                size="sm"
                                onClick={toggleSelectAllPlanes}
                            >
                                {allPlanesSelected ? "Désélectionner tout" : "Sélectionner tout"}
                            </Button>
                            {planesProp?.map((plane) => (
                                <Button
                                    key={plane.id}
                                    variant={sessionData.planeId.includes(plane.id) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onClickPlane(plane.id)}
                                >
                                    {plane.name}
                                </Button>
                            ))}
                        </div>
                        {warning && (
                            <div className="flex items-center text-warning mt-2">
                                <IoIosWarning className="mr-2" />
                                <span>{warning}</span>
                            </div>
                        )}
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
                            <Popover open={isOpenCal2} onOpenChange={setIsOpenCal2}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="endRecurrence"
                                        variant={"outline"}
                                        className={`w-full justify-start text-left font-normal ${!sessionData.endReccurence && "text-muted-foreground"}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {sessionData.endReccurence ? sessionData.endReccurence.toLocaleDateString() : "Choisir une date de fin"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={sessionData.endReccurence}
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
                            <Button variant="link" onClick={() => setIsPopoverOpen(false)} className='w-fit text-gray-500'>
                                Annuler
                            </Button>
                        </span>
                        <span>
                            <Button variant="perso" onClick={onConfirm} disabled={loading} className='w-fit'>
                                {loading ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </span>
                    </span>

                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default NewSession

