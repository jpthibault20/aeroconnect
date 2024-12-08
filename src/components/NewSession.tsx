/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { IoMdAddCircle } from "react-icons/io";
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Club, flight_sessions, planes, userRole } from '@prisma/client';
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
import { IoIosWarning } from "react-icons/io";
import { Button } from '../components/ui/button';
import { CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { fr } from "date-fns/locale";
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { minutes, sessionDurationMin } from '@/config/configClub';
import { FaArrowRightLong, FaCheck } from "react-icons/fa6";
import { Switch } from "@/components/ui/switch";
import { RxCross2 } from "react-icons/rx";
import { interfaceSessions, newSession } from '@/api/db/sessions';
import { useToast } from "@/hooks/use-toast"
import { Spinner } from './ui/SpinnerVariants';
import { getClub } from '@/api/db/club';

interface Props {
    display: "desktop" | "phone";
    style?: string;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
}
// début de composant
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NewSession = ({ display, setSessions, planesProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const { toast } = useToast()
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [isOpenPopover, setIsPopoverOpen] = useState(false);
    const [isOpenCal1, setIsOpenCal1] = useState(false);
    const [isOpenCal2, setIsOpenCal2] = useState(false);
    const [switchReccurence, setSwitchReccurence] = useState(false);
    const [club, setClub] = useState<Club>();
    const [sessionData, setSessionData] = useState<interfaceSessions>({
        date: undefined,
        startHour: "9",
        startMinute: "00",
        endHour: "11",
        endMinute: "00",
        duration: sessionDurationMin,
        endReccurence: undefined,
        planeId: planesProp.map(plane => plane.id) // Remove array brackets
    });

    // Calul de la date de fin de reccurence en fonction de la date de début avec 1 semaine de plus (delais minimum)
    useEffect(() => {
        if (!switchReccurence) setSessionData(prev => ({ ...prev, endReccurence: undefined }))
        if (switchReccurence && sessionData.date) {
            const dateStart = new Date(sessionData.date!.getFullYear(), sessionData.date!.getMonth(), sessionData.date!.getDate())
            const dateEnd = new Date(dateStart)
            dateEnd.setDate(dateStart.getDate() + 7)
            setSessionData(prev => ({ ...prev, endReccurence: dateEnd }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [switchReccurence, sessionData.date])

    // Calcul de l'heure de fin par défault en fonction de l'heure de début
    useEffect(() => {
        const startTime = new Date(1999, 0, 0, Number(sessionData.startHour), Number(sessionData.startMinute))
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + sessionDurationMin)
        setSessionData(prev => ({ ...prev, endHour: String(endTime.getHours()), endMinute: endTime.getMinutes() === 0 ? "00" : String(endTime.getMinutes()) }))
    }, [sessionData.startHour, sessionData.startMinute])

    useEffect(() => {
        if (sessionData.planeId.length === 0) {
            setWarning("Attention, aucun avion n'a été sélectionné")
        }
        else {
            setWarning("")
        }
    }, [sessionData])

    useEffect(() => {
        const getClubAPI = async () => {
            const club = await getClub(currentUser?.clubID as string);
            if (!club) {
                return;
            }
            setClub(club);
        }
        getClubAPI();
    }, [currentUser?.clubID]);

    // si l'utilisateur n'as pas le bon role il ne pourras pas voir cette page de création de session
    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT) || currentUser?.role.includes(userRole.INSTRUCTOR))) {
        return null;
    }

    // permet de verifier si tous les avions sont séléctioné ou pas boolean variable
    const allPlanesSelected = planesProp?.length === sessionData.planeId.length;

    // fonction permettant de sélectionner un avion pour l'affichage dans la liste des avions
    const onClickPlane = (plane: string) => {
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
            planeId: allPlanesSelected ? [] : planesProp!.map(p => p.id)
        }));
    };

    const onConfirm = async () => {
        setLoading(true); // Activer l'état de chargement
        try {
            // Envoyer les données de session au backend
            const res = await newSession(sessionData, currentUser);

            if (res?.error) {
                setError(res.error);
            } else if (res?.success) {
                if (res?.sessions && Array.isArray(res.sessions)) {
                    // Si "sessions" est un tableau, mettez à jour l'état
                    setSessions((prev) => [...prev, ...res.sessions]);
                }
                setError("");
                toast({
                    title: res.success,
                    duration: 5000,
                });

                // Fermer le popover après le succès
                setIsPopoverOpen(false);
            } else {
                // Gérer les cas imprévus où aucune clé `success` ou `error` n'est présente
                setError("Une erreur est survenue (E_002: réponse inattendue du serveur)");
            }
        } catch (error) {
            // Gérer les erreurs imprévues
            console.error("Erreur lors de l'envoi des données :", error);
            setError("Une erreur est survenue lors de l'envoi des données.");
        } finally {
            // Rafraîchir l'état et désactiver le chargement
            setLoading(false);
        }
    };




    // affichage du composant(bouton de nouvelle session et card de configuration)
    return (
        <Dialog open={isOpenPopover} onOpenChange={setIsPopoverOpen}>
            <DialogTrigger
                className={`${display === "desktop" ? "bg-[#774BBE] hover:bg-[#3d2365] text-white" : ""} h-full rounded-md px-2 font-medium`}
            >
                {display === "desktop" ? <p>Nouvelle session</p> : <IoMdAddCircle size={27} color="#774BBE" />}
            </DialogTrigger>

            {/* Style adapté aux mobiles */}
            <DialogContent
                className={cn(
                    "bg-[#ffffff] max-w-full w-full p-4 sm:p-6",
                    "lg:max-w-[600px]", // Taille limitée pour les grands écrans
                    "h-screen flex flex-col overflow-hidden" // Hauteur complète sur mobile
                )}
            >
                {/* Header fixe */}
                <DialogHeader
                    className="flex flex-col items-center mb-3 p-4 border-b"
                >
                    <DialogTitle className="text-lg font-bold">Nouvelle session</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Configuration de la nouvelle session
                    </DialogDescription>
                </DialogHeader>

                {/* Contenu défilable */}

                <div className="flex-1 overflow-y-auto w-full">

                    {/* Calendrier */}<Label>Date de la session</Label>
                    <div className='flex w-full items-center justify-center'>
                        <Calendar
                            className=' border border-gray-200 rounded-md shadow-sm'
                            mode="single"
                            selected={sessionData.date}
                            onSelect={(date) => {
                                if (date) {
                                    const localDate = new Date(date);
                                    const utcDate = new Date(
                                        Date.UTC(
                                            localDate.getFullYear(),
                                            localDate.getMonth(),
                                            localDate.getDate(),
                                            localDate.getHours(),
                                            localDate.getMinutes(),
                                            localDate.getSeconds()
                                        )
                                    );
                                    setSessionData((prev) => ({ ...prev, date: utcDate }));
                                }
                                setIsOpenCal1(false);
                            }}
                            initialFocus
                            locale={fr}
                        />
                    </div>



                    {/* Sélection des heures et minutes */}
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 mt-4">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <Select value={sessionData.startHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, startHour: value }))}>
                                <SelectTrigger className="w-[65px] bg-white" disabled={loading}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {club?.HoursOn.slice(0, -1).map((h) => (
                                        <SelectItem key={`start-${h}`} value={h.toString()}>
                                            {h}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p>h</p>
                            <Select value={sessionData.startMinute} onValueChange={(value) => setSessionData(prev => ({ ...prev, startMinute: value }))}>
                                <SelectTrigger className="w-[65px] bg-white" disabled={loading}>
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
                            <Select value={sessionData.endHour} onValueChange={(value) => setSessionData(prev => ({ ...prev, endHour: value }))}>
                                <SelectTrigger className="w-[65px] bg-white" disabled={loading}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {club?.HoursOn.map((h) => (
                                        <SelectItem key={`end-${h}`} value={h.toString()}>
                                            {h}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p>h</p>
                            <Select value={sessionData.endMinute} onValueChange={(value) => setSessionData(prev => ({ ...prev, endMinute: value }))}>
                                <SelectTrigger className="w-[65px] bg-white" disabled={loading}>
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

                    {/* Avion(s) */}
                    <div className='mt-6'>
                        <Label>Avion(s)</Label>
                        <div className='w-full h-fit min-h-10 border border-gray-200 rounded-md shadow-sm flex flex-wrap p-2 gap-2 bg-gray-100'>
                            {sessionData.planeId.map((plane, index) => (
                                <div key={index} className='flex items-center justify-between bg-gray-200 rounded-md px-4 py-1'>
                                    <p>{planesProp?.find(p => p.id === plane)?.name}</p>
                                </div>
                            ))}
                        </div>

                        {/* Grille responsive pour les avions */}
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4'>
                            <Button
                                className={`w-full justify-center text-left font-normal ${allPlanesSelected ? "bg-red-500" : "bg-gray-200 "} rounded-md text-black hover:bg-gray-300`}
                                onClick={toggleSelectAllPlanes}
                                disabled={loading}
                            >
                                {allPlanesSelected ? "Effacer" : "Tous"}
                            </Button>
                            {planesProp?.map((plane, index) => (
                                <Button
                                    key={index}
                                    className={`w-full justify-center text-left border border-gray-200 font-normal bg-gray-200 hover:bg-red-500 md:hover:bg-gray-300 rounded-md text-black ${sessionData.planeId.includes(plane.id) && "bg-red-500"}`}
                                    onClick={() => onClickPlane(plane.id)}
                                    disabled={loading}
                                >
                                    {plane.name}
                                </Button>
                            ))}
                        </div>
                        {warning && (
                            <div className='text-orange-500 w-full p-2 mt-3 bg-[#FFF9F4] rounded-lg flex items-center space-x-2'>
                                <IoIosWarning size={20} />
                                <div>
                                    {warning}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Récurrence */}
                    <div className='mt-6'>
                        <Label>Récurrence</Label>
                        <div className='flex items-center justify-between'>
                            <p>Répéter cette session chaque semaine</p>
                            <div className='flex items-center space-x-2'>
                                <RxCross2 color='red' />
                                <Switch onCheckedChange={() => setSwitchReccurence(!switchReccurence)} checked={switchReccurence} disabled={loading} />
                                <FaCheck color='green' />
                            </div>
                        </div>
                    </div>

                    {/* Récurrence avec Popover pour la date */}
                    {switchReccurence && (
                        <div className='flex flex-col space-y-3 mt-6'>
                            <Label>Date de la dernière session</Label>
                            <div className="flex w-full items-center justify-center">
                                <Calendar
                                    className=' border border-gray-200 rounded-md shadow-sm'
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
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className='text-red-500 w-full p-2  bg-[#FFF4F4] rounded-lg flex items-center space-x-2'>
                            <IoIosWarning size={20} />
                            <div>
                                {error}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter
                    className="sticky bottom-0 z-50 p-4 border-t flex-shrink-0"
                >
                    <DialogClose className="bg-gray-200 text-black px-4 py-2 rounded-md w-full sm:w-auto text-center">
                        Annuler
                    </DialogClose>
                    {loading ? (
                        <Spinner />
                    ) : (
                        <Button
                            onClick={onConfirm}
                            disabled={loading}
                            className="bg-[#774BBE] text-white px-4 py-2 rounded-md w-full sm:w-auto text-center"
                        >
                            Enregistrer
                        </Button>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog>

    );
};

export default NewSession;
