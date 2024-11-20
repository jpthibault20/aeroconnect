/* eslint-disable @typescript-eslint/no-unused-vars */
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
    console.log("SessionPopup | Rendering...", sessions);
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

    // Charger tous les instructeurs et avions au chargement initial, avec condition sur studentID et operational pour les avions
    // useEffect(() => {
    //     setEndDate(new Date(sessions[0].sessionDateStart.getUTCFullYear(), sessions[0].sessionDateStart.getUTCMonth(), sessions[0].sessionDateStart.getUTCDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes() + sessions[0].sessionDateDuration_min, 0));
    //     // Obtenir les instructeurs uniques pour les sessions sans studentID
    //     const uniqueInstructors = Array.from(
    //         new Set(
    //             sessions
    //                 .filter(session => !session.studentID) // Filtrer les sessions sans studentID
    //                 .map(session => session.pilotID)
    //         )
    //     );

    //     const allStudentPlaneIDs = sessions.flatMap(session => session.studentPlaneID).filter(Boolean); // Aplatir et filtrer les null
    //     const uniquePlanes = Array.from(
    //         new Set(
    //             sessions
    //                 .flatMap(session => session.planeID) // Aplatir tous les planeID des sessions
    //                 .filter(
    //                     planeID =>
    //                         planeID !== null &&
    //                         !allStudentPlaneIDs.includes(planeID) // Exclure les planeID dans studentPlaneID
    //                 )
    //         )
    //     );

    //     if (uniqueInstructors.length === 0 || uniquePlanes.length === 0) {
    //         setDisabledMessage("Il n'y a actuellement aucun vol disponible pour cette session");
    //         setSubmitDisabled(true);
    //     }
    //     else if (sessions[0].sessionDateStart < new Date()) {
    //         setDisabledMessage("La date de la session est passée");
    //         setSubmitDisabled(true);
    //     }
    //     else if (currentUser?.role === "USER") {
    //         setDisabledMessage("Vous n'avez pas les droits pour s'inscrire a une session, contacter l'administrateur du club");
    //         setSubmitDisabled(true);
    //     }
    //     else {
    //         setDisabledMessage("");
    //         setSubmitDisabled(false);
    //     }

    //     // Charger les instructeurs et les avions disponibles, filtrés par `operational` pour les avions
    //     Promise.all([getUserByID(uniqueInstructors), getPlanesByID(uniquePlanes)])
    //         .then(([instructorsRes, planesRes]) => {
    //             if (Array.isArray(instructorsRes)) {
    //                 setAllInstructors(instructorsRes);
    //                 setAvailableInstructors(instructorsRes); // Met à jour uniquement les instructeurs sans studentID
    //             }
    //             if (Array.isArray(planesRes)) {
    //                 const operationalPlanes = planesRes.filter(plane => plane.operational); // Filtrer les avions opérationnels
    //                 setAllPlanes(operationalPlanes);
    //                 setAvailablePlanes(operationalPlanes);
    //             }
    //         })
    //         .catch(error => console.error("Error fetching data:", error));
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [sessions]);


    // // Mettre à jour les listes disponibles en fonction des sélections
    // useEffect(() => {
    //     if (instructor !== "nothing") {
    //         const planesForInstructor = sessions
    //             .filter(session => session.pilotID === instructor)
    //             .flatMap(session => session.planeID);
    //         setAvailablePlanes(allPlanes.filter(plane => planesForInstructor.includes(plane.id)));
    //     } else {
    //         setAvailablePlanes(allPlanes);
    //     }
    // }, [instructor, allPlanes, sessions]);

    // useEffect(() => {
    //     if (plane !== "nothing") {
    //         const instructorsForPlane = sessions
    //             .filter(session => session.planeID.includes(plane))
    //             .map(session => session.pilotID);
    //         setAvailableInstructors(allInstructors.filter(instructor => instructorsForPlane.includes(instructor.id)));
    //     } else {
    //         setAvailableInstructors(allInstructors);
    //     }
    // }, [plane, allInstructors, sessions]);

    // Fonction pour formater la date
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(date);
    };

    // Fonction pour trouver l'ID de la session correspondante
    const getSessionId = () => {
        const matchedSession = sessions.find(
            session =>
                session.pilotID === instructor &&
                session.planeID.includes(plane)
        );
        return matchedSession ? matchedSession.id : null;
    };

    // Fonction de soumission qui affiche l'ID de la session
    const onSubmit = () => {
        const verifyAndRegister = async () => {

            const sessionId = getSessionId();
            if (!sessionId) {
                setError("Une erreur est survenue (E_002: informations are undefined)");
                return;
            }
            try {
                setLoading(true);
                const res = await studentRegistration(sessionId, currentUser!.id, plane);
                if (res.error) {
                    setError(res.error);
                }
                if (res.success) {
                    setError("");
                    toast({
                        title: res.success,
                    });
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

        verifyAndRegister();
    };

    if (sessions.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Détails de la session</DialogTitle>
                    <DialogDescription className='flex flex-col'>
                        Session du {formatDate(new Date(sessions[0].sessionDateStart.getUTCFullYear(), sessions[0].sessionDateStart.getUTCMonth(), sessions[0].sessionDateStart.getUTCDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes(), 0))}
                    </DialogDescription>
                </DialogHeader>

                <div className='grid grid-cols-5'>
                    <div className='col-span-2'>
                        <InputComponent
                            label='Début de la session'
                            id='start'
                            value={formatDate(new Date(sessions[0].sessionDateStart.getUTCFullYear(), sessions[0].sessionDateStart.getUTCMonth(), sessions[0].sessionDateStart.getUTCDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes(), 0))}
                            loading={true}
                            styleInput='border border-gray-400'
                        />
                    </div>

                    <div className='h-full w-full flex items-center justify-center col-span-1'>
                        <FaArrowRight />
                    </div>

                    <div className='col-span-2'>
                        <InputComponent
                            label='Fin de la session'
                            id='start'
                            value={formatDate(endDate)}
                            loading={true}
                            styleInput='border border-gray-400'
                        />
                    </div>
                </div>

                <div>
                    <Label>Instructeur</Label>
                    <Select value={instructor} onValueChange={(val) => setInstructor(val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Instructeurs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nothing">Instructeurs</SelectItem>
                            {availableInstructors.map((item, index) => (
                                <SelectItem key={index} value={item.id}>
                                    {item.lastName.slice(0, 1).toUpperCase()}.{item.firstName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Avion</Label>
                    <Select value={plane} onValueChange={(val) => setPlane(val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Avions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nothing">Avions</SelectItem>
                            {availablePlanes.map((item, index) => (
                                <SelectItem key={index} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {error ? (
                    <div className='text-red-500 w-full p-2  bg-[#FFF4F4] rounded-lg flex items-center space-x-2 '>
                        <IoIosWarning size={20} />
                        <div>
                            {error}
                        </div>
                    </div>
                ) :
                    null
                }


                {!submitDisabled ? (
                    <div className='flex w-full justify-end space-x-6'>
                        <button onClick={() => setIsOpen(false)} disabled={loading}>
                            cancel
                        </button>
                        {loading ? <Spinner /> : <Button className='bg-[#774BBE] hover:bg-[#3d2365]' onClick={onSubmit}>
                            S&apos;inscrire
                        </Button>}
                    </div>
                ) : (
                    <div className='text-orange-500 w-full p-2  bg-[#fffff4] rounded-lg flex items-center space-x-2 border border-orange-500'>
                        <IoIosWarning size={20} />
                        <div>
                            {disabledMessage}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;
