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
    const [instructor, setInstructor] = useState("nothing");
    const [plane, setPlane] = useState("nothing");
    const [availableInstructors, setAvailableInstructors] = useState<User[]>([]);
    const [availablePlanes, setAvailablePlanes] = useState<planes[]>([]);
    const [allInstructors, setAllInstructors] = useState<User[]>([]);
    const [allPlanes, setAllPlanes] = useState<planes[]>([]);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState("");

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

            for (let i = 0; i < sessions.length; i++) {
                if (sessions[i].studentID !== null) {
                    setSubmitDisabled(true);
                    setDisabledMessage("cette session est déjà réservée");
                    break;
                }
                else {
                    setSubmitDisabled(false);
                    setDisabledMessage("");
                }
            }
        }
    }, [sessions]);

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
