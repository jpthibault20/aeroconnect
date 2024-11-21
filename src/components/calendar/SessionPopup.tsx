import React, { useState, useEffect } from 'react';
import { DialogContent, DialogTrigger } from '../ui/dialog';
import { flight_sessions, planes, User } from '@prisma/client';
import { Dialog } from '@radix-ui/react-dialog';
import { getUserByID } from '@/api/db/users';
import { getPlanesByID } from '@/api/db/planes';
import { studentRegistration } from '@/api/db/sessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import SessionHeader from './SessionHeader';
import SessionDate from './SessionDate';
import InstructorSelect from './InstructorSelect';
import PlaneSelect from './PlaneSelect';
import SubmitButton from './SubmitButton';
import { toast } from '@/hooks/use-toast';
import { filterPilotePlane } from '@/api/popupCalendar';

interface prop {
    children: React.ReactNode;
    sessions: flight_sessions[];
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    reload: boolean;
}

const SessionPopup = ({ sessions, children, setReload, reload }: prop) => {
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

    filterPilotePlane(sessions).then((res) => {
        console.log(res)
    })

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
                <SessionHeader sessionStartDate={new Date(sessions[0].sessionDateStart)} />
                <SessionDate startDate={new Date(sessions[0].sessionDateStart)} endDate={endDate} />
                <InstructorSelect instructors={availableInstructors} selectedInstructor={instructor} onInstructorChange={setInstructor} />
                <PlaneSelect planes={availablePlanes} selectedPlane={plane} onPlaneChange={setPlane} />
                <SubmitButton submitDisabled={submitDisabled} onSubmit={onSubmit} loading={loading} error={error} disabledMessage={disabledMessage} />
            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;
