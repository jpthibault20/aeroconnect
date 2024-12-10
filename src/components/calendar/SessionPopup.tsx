import React, { useState, useEffect } from "react";
import { DialogContent, DialogTrigger } from "../ui/dialog";
import { flight_sessions, planes, User } from "@prisma/client";
import { Dialog } from "@radix-ui/react-dialog";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import SessionHeader from "./SessionHeader";
import SessionDate from "./SessionDate";
import InstructorSelect from "./InstructorSelect";
import PlaneSelect from "./PlaneSelect";
import SubmitButton from "./SubmitButton";
import { toast } from "@/hooks/use-toast";
import { filterPilotePlane } from "@/api/popupCalendar";
import { studentRegistration } from "@/api/db/sessions";

interface Prop {
    children: React.ReactNode;
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
}

const SessionPopup = ({ sessions, children, setSessions }: Prop) => {
    const { currentUser } = useCurrentUser();

    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitDisabled, setSubmitDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState("");

    const [instructor, setInstructor] = useState<string>("nothing");
    const [plane, setPlane] = useState<string>("nothing");

    const [allInstructors, setAllInstructors] = useState<User[]>([]);
    const [availableInstructors, setAvailableInstructors] = useState<User[]>([]);
    const [allPlanes, setAllPlanes] = useState<planes[]>([]);
    const [availablePlanes, setAvailablePlanes] = useState<planes[]>([]);

    // Charger les pilotes et avions disponibles
    useEffect(() => {
        if (!sessions.length) return;

        const loadPilotsAndPlanes = async () => {
            try {
                const { pilotes, planes } = await filterPilotePlane(sessions);
                setAllInstructors(pilotes);
                setAllPlanes(planes);
                setAvailableInstructors(pilotes);
                setAvailablePlanes(planes);
            } catch (err) {
                console.error("Error loading pilots and planes:", err);
            }
        };

        loadPilotsAndPlanes();

        // Vérification des sessions disponibles
        const allSessionsTaken = sessions.every(session => session.studentID !== null);
        const sessionDate = new Date(sessions[0].sessionDateStart);
        const now = new Date();

        if (allSessionsTaken) {
            setSubmitDisabled(true);
            setDisabledMessage("Aucune session disponible sur ce créneau ...");
        } else if (sessionDate < now) {
            setSubmitDisabled(true);
            setDisabledMessage("La date de la session est passée ...");
        } else {
            setSubmitDisabled(false);
            setDisabledMessage("");
        }
    }, [sessions]);

    // Mise à jour des avions disponibles selon l'instructeur sélectionné
    useEffect(() => {
        setAvailablePlanes(
            instructor === "nothing"
                ? allPlanes
                : allPlanes.filter(plane =>
                    sessions.some(session => session.pilotID === instructor && session.planeID.includes(plane.id))
                )
        );
    }, [instructor, allPlanes, sessions]);

    // Mise à jour des instructeurs disponibles selon l'avion sélectionné
    useEffect(() => {
        setAvailableInstructors(
            plane === "nothing"
                ? allInstructors
                : allInstructors.filter(instructor =>
                    sessions.some(session => session.planeID.includes(plane) && session.pilotID === instructor.id)
                )
        );
    }, [plane, allInstructors, sessions]);

    const onSubmit = async () => {
        const sessionId = sessions.find(
            session => session.pilotID === instructor && session.planeID.includes(plane)
        )?.id;

        if (!sessionId) {
            setError("Une erreur est survenue (E_002: informations undefined)");
            return;
        }

        try {
            setLoading(true);
            const res = await studentRegistration(sessionId, currentUser!.id, plane);
            if (res.error) {
                setError(res.error);
            } else if (res.success) {
                toast({ title: res.success, duration: 3000 });
                setIsOpen(false);
                setSessions(prev =>
                    prev.map(s =>
                        s.id === sessionId
                            ? { ...s, studentID: currentUser!.id, studentFirstName: currentUser!.firstName, studentLastName: currentUser!.lastName, studentPlaneID: plane }
                            : s
                    )
                );
            }
        } catch (err) {
            console.error(err);
            setError("Une erreur est survenue lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    if (!sessions.length) return null;

    const startDate = new Date(sessions[0].sessionDateStart);
    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getMinutes() + sessions[0].sessionDateDuration_min);

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
