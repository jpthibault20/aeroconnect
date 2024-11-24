import React, { useState, useEffect } from 'react';
import { DialogContent, DialogTrigger } from '../ui/dialog';
import { flight_sessions, planes, User } from '@prisma/client';
import { Dialog } from '@radix-ui/react-dialog';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import SessionHeader from './SessionHeader';
import SessionDate from './SessionDate';
import InstructorSelect from './InstructorSelect';
import PlaneSelect from './PlaneSelect';
import SubmitButton from './SubmitButton';
import { toast } from '@/hooks/use-toast';
import { filterPilotePlane } from '@/api/popupCalendar';
import { studentRegistration } from '@/api/db/sessions';

interface Prop {
    children: React.ReactNode;
    sessions: flight_sessions[];
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    reload: boolean;
}

const SessionPopup = ({ sessions, children, setReload, reload }: Prop) => {
    const { currentUser } = useCurrentUser();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState("");
    const [instructor, setInstructor] = useState("nothing");
    const [allInstructors, setAllInstructors] = useState<User[]>([]);
    const [availableInstructors, setAvailableInstructors] = useState<User[]>([]);
    const [plane, setPlane] = useState("nothing");
    const [allPlanes, setAllPlanes] = useState<planes[]>([]);
    const [availablePlanes, setAvailablePlanes] = useState<planes[]>([]);


    // Charger les pilotes et avions disponibles
    useEffect(() => {
        if (sessions.length > 0) {
            (async () => {
                try {
                    const { pilotes, planes } = await filterPilotePlane(sessions);
                    setAvailableInstructors(pilotes);
                    setAvailablePlanes(planes);
                    setAllInstructors(pilotes);
                    setAllPlanes(planes);
                } catch (error) {
                    console.error("Error loading pilots and planes:", error);
                }
            })();

            // Vérifier si tous les `studentID` sont remplis
            const allSessionsTaken = sessions.every(session => session.studentID !== null);

            if (allSessionsTaken) {
                setSubmitDisabled(true);
                setDisabledMessage("Aucune session disponible sur ce créneau ...");
            } else {
                setSubmitDisabled(false);
                setDisabledMessage("");
            }

            const sessionDate = new Date(sessions[0].sessionDateStart.getFullYear(), sessions[0].sessionDateStart.getMonth(), sessions[0].sessionDateStart.getDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes(), sessions[0].sessionDateStart.getUTCSeconds());
            const now = new Date();
            if (sessionDate.getTime() < now.getTime()) {
                setSubmitDisabled(true);
                setDisabledMessage("La date de la session est passée ...");
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessions]); // de base 'sessions' mais génère une erreur quand l'inscription es fini es qu'il n'y a plus de sessions dispo, affichage d'un message d'erreur


    // Mettre à jour les avions en fonction de l'instructeur sélectionné
    useEffect(() => {
        if (instructor !== "nothing") {
            const planesForInstructor = sessions
                .filter(session => session.pilotID === instructor)
                .flatMap(session => session.planeID);
            setAvailablePlanes(allPlanes.filter(plane => planesForInstructor.includes(plane.id)));
        } else {
            setAvailablePlanes(allPlanes);
        }
    }, [instructor, allPlanes, sessions]);

    // Mettre à jour les instructeurs en fonction de l'avion sélectionné
    useEffect(() => {
        if (plane !== "nothing") {
            const instructorsForPlane = sessions
                .filter(session => session.planeID.includes(plane))
                .map(session => session.pilotID);
            setAvailableInstructors(allInstructors.filter(instructor => instructorsForPlane.includes(instructor.id)));
        } else {
            setAvailableInstructors(allInstructors);
        }
    }, [plane, allInstructors, sessions]);

    const onSubmit = async () => {
        const getSessionId = () => {
            const matchedSession = sessions.find(
                session =>
                    session.pilotID === instructor &&
                    session.planeID.includes(plane)
            );
            return matchedSession ? matchedSession.id : null;
        };

        const sessionId = getSessionId();
        if (!sessionId) {
            setError("Une erreur est survenue (E_002: informations are undefined)");
            return;
        }

        try {
            setLoading(true);
            const res = await studentRegistration(sessionId, currentUser!.id, plane!);
            if (res.error) setError(res.error);
            if (res.success) {
                setError("");
                toast({ title: res.success, duration: 3000 });
                setReload(!reload);
                setIsOpen(false);

                sessions.find((item) => {
                    if (item.id === sessionId) {
                        item.studentID = currentUser!.id
                        item.studentFirstName = currentUser!.firstName
                        item.studentLastName = currentUser!.lastName
                        item.studentPlaneID = plane
                    }
                    return
                })
            }
        } catch (error) {
            console.error(error);
            setError("Une erreur est survenue lors de l'inscription de l'étudiant.");
        } finally {
            setLoading(false);
        }
    };

    if (sessions.length === 0) return null;

    const startDate = new Date(sessions[0].sessionDateStart.getFullYear(), sessions[0].sessionDateStart.getMonth(), sessions[0].sessionDateStart.getDate(), sessions[0].sessionDateStart.getUTCHours(), sessions[0].sessionDateStart.getUTCMinutes(), 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getUTCMinutes() + sessions[0].sessionDateDuration_min);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <SessionHeader sessionStartDate={startDate} />
                <SessionDate startDate={startDate} endDate={endDate} />
                <InstructorSelect instructors={availableInstructors} selectedInstructor={instructor} onInstructorChange={setInstructor} />
                <PlaneSelect planes={availablePlanes} selectedPlane={plane} onPlaneChange={setPlane} />
                <SubmitButton submitDisabled={submitDisabled} onSubmit={onSubmit} loading={loading} error={error} disabledMessage={disabledMessage} />
            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;
