import React, { useEffect, useState } from 'react';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '../ui/dialog';
import { flight_sessions, planes, User } from '@prisma/client';
import { Dialog } from '@radix-ui/react-dialog';
import InputComponent from '../InputComponent';
import { FaArrowRight } from "react-icons/fa";
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../ui/select';
import { getUserByID } from '@/api/db/users';
import { getPlanesByID } from '@/api/db/planes';
import { Button } from '../ui/button';
import { studentRegistration } from '@/api/db/sessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { IoIosWarning } from 'react-icons/io';
import { toast } from '@/hooks/use-toast';
import { Spinner } from '../ui/SpinnerVariants';

interface prop {
    children: React.ReactNode;
    sessions: flight_sessions[];
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    reload: boolean;
}

const SessionPopup = ({ sessions, children, setReload, reload }: prop) => {
    console.log("SessionPopup | Rendering...");
    const { currentUser } = useCurrentUser();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [instructor, setInstructor] = useState("nothing");
    const [plane, setPlane] = useState("nothing");
    const [availableInstructors, setAvailableInstructors] = useState<User[]>([]);
    const [availablePlanes, setAvailablePlanes] = useState<planes[]>([]);
    const [allInstructors, setAllInstructors] = useState<User[]>([]);
    const [allPlanes, setAllPlanes] = useState<planes[]>([]);
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState("");

    useEffect(() => {
        const formatEndDate = (sessionStart: Date, duration: number) => {
            return new Date(sessionStart.getUTCFullYear(), sessionStart.getUTCMonth(), sessionStart.getUTCDate(), sessionStart.getUTCHours(), sessionStart.getUTCMinutes() + duration, 0);
        };

        if (sessions.length === 0) return;

        const startDate = sessions[0].sessionDateStart;
        setEndDate(formatEndDate(startDate, sessions[0].sessionDateDuration_min));

        // Obtenir les instructeurs uniques et les avions disponibles
        const uniqueInstructors = Array.from(
            new Set(sessions.filter(session => !session.studentID).map(session => session.pilotID))
        );

        const allStudentPlaneIDs = sessions.flatMap(session => session.studentPlaneID).filter(Boolean);
        const uniquePlanes = Array.from(
            new Set(sessions.flatMap(session => session.planeID).filter(planeID => planeID !== null && !allStudentPlaneIDs.includes(planeID)))
        );

        // Vérification des conditions d'affichage du message d'erreur
        if (!uniqueInstructors.length || !uniquePlanes.length) {
            setDisabledMessage("Il n'y a actuellement aucun vol disponible pour cette session");
            setSubmitDisabled(true);
        } else if (startDate < new Date()) {
            setDisabledMessage("La date de la session est passée");
            setSubmitDisabled(true);
        } else if (currentUser?.role === "USER") {
            setDisabledMessage("Vous n'avez pas les droits pour s'inscrire à une session, contacter l'administrateur du club");
            setSubmitDisabled(true);
        } else {
            setDisabledMessage("");
            setSubmitDisabled(false);
        }

        // Charger les instructeurs et les avions disponibles
        Promise.all([getUserByID(uniqueInstructors), getPlanesByID(uniquePlanes)])
            .then(([instructorsRes, planesRes]) => {
                if (Array.isArray(instructorsRes)) setAllInstructors(instructorsRes);
                if (Array.isArray(planesRes)) {
                    const operationalPlanes = planesRes.filter(plane => plane.operational);
                    setAllPlanes(operationalPlanes);
                }
            })
            .catch(error => console.error("Error fetching data:", error));

    }, [sessions, currentUser]);

    useEffect(() => {
        if (instructor !== "nothing") {
            const planesForInstructor = sessions.filter(session => session.pilotID === instructor).flatMap(session => session.planeID);
            setAvailablePlanes(allPlanes.filter(plane => planesForInstructor.includes(plane.id)));
        } else {
            setAvailablePlanes(allPlanes);
        }
    }, [instructor, allPlanes, sessions]);

    useEffect(() => {
        if (plane !== "nothing") {
            const instructorsForPlane = sessions.filter(session => session.planeID.includes(plane)).map(session => session.pilotID);
            setAvailableInstructors(allInstructors.filter(instructor => instructorsForPlane.includes(instructor.id)));
        } else {
            setAvailableInstructors(allInstructors);
        }
    }, [plane, allInstructors, sessions]);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
    };

    const getSessionId = () => {
        const matchedSession = sessions.find(session => session.pilotID === instructor && session.planeID.includes(plane));
        return matchedSession ? matchedSession.id : null;
    };

    const onSubmit = async () => {
        const sessionId = getSessionId();
        if (!sessionId) {
            setError("Une erreur est survenue (E_002: informations are undefined)");
            return;
        }

        try {
            setLoading(true);
            const res = await studentRegistration(sessionId, currentUser!.id, plane);
            if (res.error) setError(res.error);
            if (res.success) {
                setError("");
                toast({ title: res.success });
                setReload(!reload);
                setIsOpen(false);
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur est survenue lors de l'inscription de l'étudiant.");
        } finally {
            setLoading(false);
        }
    };

    if (sessions.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Détails de la session</DialogTitle>
                    <DialogDescription className="flex flex-col">
                        Session du {formatDate(new Date(sessions[0].sessionDateStart))}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-5">
                    <div className="col-span-2">
                        <InputComponent label="Début de la session" id="start" value={formatDate(new Date(sessions[0].sessionDateStart))} loading={true} styleInput="border border-gray-400" />
                    </div>
                    <div className="h-full w-full flex items-center justify-center col-span-1">
                        <FaArrowRight />
                    </div>
                    <div className="col-span-2">
                        <InputComponent label="Fin de la session" id="end" value={formatDate(endDate)} loading={true} styleInput="border border-gray-400" />
                    </div>
                </div>

                <div>
                    <Label>Instructeur</Label>
                    <Select value={instructor} onValueChange={setInstructor}>
                        <SelectTrigger>
                            <SelectValue placeholder="Instructeurs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nothing">Instructeurs</SelectItem>
                            {availableInstructors.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{`${item.lastName.charAt(0)}.${item.firstName}`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Avion</Label>
                    <Select value={plane} onValueChange={setPlane}>
                        <SelectTrigger>
                            <SelectValue placeholder="Avions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nothing">Avions</SelectItem>
                            {availablePlanes.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="mt-4">
                    {submitDisabled && (
                        <div className="flex justify-start gap-2 items-center text-red-500">
                            <IoIosWarning size={16} />
                            <span>{disabledMessage}</span>
                        </div>
                    )}
                    <Button className="w-full mt-3" disabled={submitDisabled} onClick={onSubmit}>
                        {loading ? <Spinner /> : "S'inscrire"}
                    </Button>
                </div>

                {error && <div className="text-red-500 mt-2">{error}</div>}
            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;
