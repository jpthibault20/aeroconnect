import React, { useState, useEffect } from "react";
import { DialogContent, DialogTrigger } from "./ui/dialog";
import { Club, flight_sessions, planes, User } from "@prisma/client";
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
import { sendNotificationBooking, sendStudentNotificationBooking } from "@/lib/mail";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { MessageSquareMore, Plane } from "lucide-react";
import { PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import SessionPopupUpdate from "./SessionPopupUpdate";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import ShowCommentSession from "./ShowCommentSession";

interface Prop {
    children: React.ReactNode;
    sessions: flight_sessions[];
    noSessions: boolean;
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    usersProps: User[]
    planesProp: planes[]
}

const SessionPopup = ({ sessions, children, setSessions, usersProps, planesProp, noSessions }: Prop) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();

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
    const [session, setSession] = useState<flight_sessions>();
    const [studentComment, setStudentComment] = useState("");

    const filterdPlanes = planesProp.filter((p) => currentUser?.classes.includes(p.classes))

    useEffect(() => {
        if (sessions.length === 1) {
            setSession(sessions[0]);
            return;
        }

        setSession(sessions.find(
            session =>
                session.pilotID === instructor &&
                (plane === "noPlane" || session.planeID.includes(plane))
        ));

        setStudentComment(session?.studentComment || "");

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessions, instructor, plane]);


    // Charger les pilotes et avions disponibles
    useEffect(() => {
        if (!sessions.length) return;

        const loadPilotsAndPlanes = async () => {
            try {
                const { pilotes, planes } = await filterPilotePlane(sessions, usersProps, filterdPlanes);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessions]);

    // Mise à jour des avions disponibles selon l'instructeur sélectionné
    useEffect(() => {
        let updatedPlanes;

        const classroomPlane = { id: "classroomSession", name: "Théorique", immatriculation: "classroomSession", operational: true, clubID: currentUser?.clubID as string, classes: 3 };

        if (instructor === "nothing") {
            updatedPlanes = allPlanes;
        } else {
            updatedPlanes = allPlanes.filter(plane =>
                sessions.some(session => session.pilotID === instructor && session.planeID.includes(plane.id))
            );
        }

        // Vérifier si une session avec planeID contient "classroomSession"
        const hasClassroomSession = sessions.some(session => (session.pilotID === instructor || instructor === "nothing") && session.studentID === null && session.planeID.includes("classroomSession"));

        if (hasClassroomSession || (instructor === "nothing" && hasClassroomSession)) {
            // Ajouter l'avion "classroomSession" si non présent dans la liste
            updatedPlanes = [...updatedPlanes, classroomPlane];
        }

        setAvailablePlanes(updatedPlanes);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instructor, allPlanes, sessions]);


    // Mise à jour des instructeurs disponibles selon l'avion sélectionné
    useEffect(() => {
        setAvailableInstructors(
            plane === "nothing" || plane === "noPlane"
                ? allInstructors
                : allInstructors.filter(instructor =>
                    sessions.some(session => session.planeID.includes(plane) && session.pilotID === instructor.id)
                )
        );
    }, [plane, allInstructors, sessions]);



    const onSubmit = async () => {
        if (!session) {
            setError("Une erreur est survenue (E_002: informations undefined)");
            return;
        }

        try {
            setLoading(true);
            const res = await studentRegistration(session, currentUser as User, plane, currentClub as Club, new Date().getTimezoneOffset() as number, studentComment as string);
            if (res.error) {
                toast({
                    title: res.error,
                    duration: 5000,
                    style: {
                        background: '#ab0b0b', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
                setError(res.error);
            } else if (res.success) {
                toast({
                    title: res.success,
                    duration: 5000,
                    style: {
                        background: '#0bab15', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
                setIsOpen(false);
                setSessions(prev =>
                    prev.map(s =>
                        s.id === session.id
                            ? { ...s, studentID: currentUser!.id, studentFirstName: currentUser!.firstName, studentLastName: currentUser!.lastName, studentPlaneID: plane, studentComment }
                            : s
                    )
                );

                const endDate = new Date(session!.sessionDateStart);
                endDate.setUTCMinutes(endDate.getUTCMinutes() + session!.sessionDateDuration_min);
                const instructorFull = usersProps.find(user => user.id === session.pilotID);
                const planeName = plane === "classroomSession" ? "Théorique" :
                    plane == "noPlane" ? "Son avion personnel" :
                        planesProp.find((p) => p.id === plane)?.name;
                const pilotComment = session.pilotComment as string;

                Promise.all([
                    sendNotificationBooking(
                        instructorFull?.email || "",
                        currentUser?.firstName || "",
                        currentUser?.lastName || "",
                        session!.sessionDateStart,
                        endDate,
                        session?.clubID as string,
                        planeName as string,
                        pilotComment as string,
                        studentComment as string

                    ),
                    sendStudentNotificationBooking(
                        currentUser?.email || "",
                        session!.sessionDateStart,
                        endDate,
                        session?.clubID as string,
                        planeName as string,
                        pilotComment as string,
                        studentComment as string

                    ),
                ]);
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

                {["ADMIN", "OWNER", "INSTRUCTOR", "MANAGER"].includes(currentUser?.role as string) ? (
                    <SessionPopupUpdate
                        sessions={sessions}
                        setSessions={setSessions}
                        usersProps={usersProps}
                        planesProp={filterdPlanes}
                    />
                ) : noSessions ? (
                    // Sessions Booked
                    <div
                        className={`grid gap-2 ${sessions.length === 1
                            ? "grid-cols-1 justify-center items-center"
                            : sessions.length === 2
                                ? "grid-cols-2 justify-center items-center"
                                : "grid-cols-3 justify-center items-center"
                            }`}
                    >
                        {sessions.map((s, index) => (
                            <div
                                key={index}
                                className="flex flex-col items-start justify-center border rounded-md p-4 text-center"
                            >
                                {/* Pilote */}
                                <div className="flex items-center space-x-2">
                                    <LiaChalkboardTeacherSolid />
                                    <p>
                                        {s.pilotLastName.slice(0, 1).toUpperCase() +
                                            "." +
                                            s.pilotFirstName}
                                    </p>
                                </div>

                                {/* Étudiant */}
                                <div className="flex items-center space-x-2">
                                    <PiStudent />
                                    <p>
                                        {s.studentLastName?.slice(0, 1)
                                            .toUpperCase() +
                                            "." +
                                            s.studentFirstName}
                                    </p>
                                </div>

                                {/* Avion */}
                                <div className="flex items-center space-x-2">
                                    <Plane className="w-4 h-4" />
                                    <p>
                                        {s.studentPlaneID === "classroomSession"
                                            ? "Théorique"
                                            : s.studentPlaneID === "noPlane"
                                                ? "Sans appareil"
                                                : planesProp.find((plane) => plane.id === s.studentPlaneID)?.name}
                                    </p>
                                </div>

                                {/* Note section */}
                                <ShowCommentSession
                                    session={s}
                                    setSessions={setSessions}
                                    usersProp={usersProps}
                                >
                                    <div className='flex items-center space-x-2'>
                                        <MessageSquareMore className='w-4 h-4' />
                                        <p>
                                            {(s.pilotComment && s.studentComment) ? "2 notes" :
                                                (s.pilotComment || s.studentComment) ? "1 note" :
                                                    "0 note"
                                            }
                                        </p>
                                    </div>
                                </ShowCommentSession>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Sessions Available
                    <>
                        <InstructorSelect
                            instructors={availableInstructors}
                            selectedInstructor={instructor}
                            onInstructorChange={setInstructor}
                        />
                        <PlaneSelect
                            planes={availablePlanes}
                            selectedPlane={plane}
                            onPlaneChange={setPlane}
                        />

                        {/* note section */}
                        <div>
                            {/* instructor note */}
                            {(session && session.pilotComment) && (
                                <div>
                                    <Label>
                                        Note de l&apos;instructeur
                                    </Label>
                                    <Textarea
                                        value={session.pilotComment || ""}
                                        disabled
                                    />
                                </div>
                            )}

                            {/* student note */}
                            {session && (
                                <div>
                                    <Label>
                                        Votres note
                                    </Label>
                                    <Textarea
                                        value={studentComment}
                                        onChange={(e) => setStudentComment(e.target.value)}
                                    />
                                </div>
                            )}

                        </div>

                        <SubmitButton
                            submitDisabled={submitDisabled}
                            onSubmit={onSubmit}
                            loading={loading}
                            error={error}
                            disabledMessage={disabledMessage}
                        />
                    </>
                )}



            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;
