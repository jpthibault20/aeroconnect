import React, { useState, useEffect } from "react";
import { DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Club, flight_sessions, planes, User } from "@prisma/client";
import { Dialog } from "./ui/dialog";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import SessionHeader from "./SessionHeader";
import SessionDate from "./SessionDate";
import InstructorSelect from "./InstructorSelect";
import PlaneSelect from "./PlaneSelect";
import SubmitButton from "./SubmitButton";
import { toast } from "@/hooks/use-toast";
import { filterPilotePlane } from "@/api/popupCalendar";
import { filterBookablePlanes, filterPlanesForBeneficiary, resolveOfferedPlaneIDs, sessionOffersPlane } from "@/lib/planeVisibility";
import { studentRegistration } from "@/api/db/sessions";
import { sendNotificationBooking, sendStudentNotificationBooking } from "@/lib/mail";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { MessageSquareMore, Plane, User as AlertCircle } from "lucide-react";
import { PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import SessionPopupUpdate from "./SessionPopupUpdate";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import ShowCommentSession from "./ShowCommentSession";
import SessionContacts from "./calendar/SessionContacts";
import BaptemeSessionValidation from "./calendar/BaptemeSessionValidation";
import { cn, LEGACY_NO_PLANE_ID } from "@/lib/utils";

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

    // Machines réservables : visibilité (club + sa propre privée) ∩ classe autorisée.
    const filterdPlanes = currentUser ? filterBookablePlanes(planesProp, currentUser) : [];

    // Une machine privée appartenant à l'utilisateur courant n'a pas à être
    // « proposée » par le créneau : elle est à lui. Sans ça, elle n'apparaît que
    // si le créateur de la séance la voyait (président/admin), et un créneau
    // ouvert par un instructeur la rendrait inaccessible à son propriétaire.
    const isOwnPlane = (planeID: string) =>
        !!currentUser && planesProp.some(p => p.id === planeID && p.ownerID === currentUser.id);

    // --- 1. LOGIC & EFFECTS (Inchangés pour garantir le fonctionnement) ---
    useEffect(() => {
        if (sessions.length === 1) {
            setSession(sessions[0]);
            return;
        }
        setSession(sessions.find(
            session =>
                session.pilotID === instructor &&
                (isOwnPlane(plane) || sessionOffersPlane(session.planeID, plane, planesProp))
        ));
        setStudentComment(session?.studentComment || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessions, instructor, plane]);

    useEffect(() => {
        if (!sessions.length) return;
        const loadPilotsAndPlanes = async () => {
            try {
                const { pilotes } = await filterPilotePlane(sessions, usersProps, filterdPlanes);

                // Machines proposées : celles offertes sur les créneaux encore
                // libres, PLUS la machine privée de l'utilisateur (cf. isOwnPlane).
                // Même règle que côté gestionnaire (filterPlanesForBeneficiary).
                const availableSessions = sessions.filter(s => s.studentID === null);
                const offeredPlaneIDs = Array.from(
                    new Set(availableSessions.flatMap(s => resolveOfferedPlaneIDs(s.planeID, planesProp)))
                );
                const unavailablePlaneIDs = sessions
                    .map(s => s.studentPlaneID)
                    .filter((id): id is string => id !== null);
                const bookable = currentUser
                    ? filterPlanesForBeneficiary(planesProp, currentUser, {
                        offeredPlaneIDs,
                        unavailablePlaneIDs,
                    })
                    : [];

                setAllInstructors(pilotes);
                setAllPlanes(bookable);
                setAvailableInstructors(pilotes);
                setAvailablePlanes(bookable);
            } catch (err) {
            }
        };
        loadPilotsAndPlanes();

        const allSessionsTaken = sessions.every(session => session.studentID !== null);
        const sessionDate = new Date(sessions[0].sessionDateStart);
        const now = new Date();

        if (allSessionsTaken) {
            setSubmitDisabled(true);
            setDisabledMessage("Aucun créneau disponible.");
        } else if (sessionDate < now) {
            setSubmitDisabled(true);
            setDisabledMessage("Date dépassée.");
        } else {
            setSubmitDisabled(false);
            setDisabledMessage("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessions]);

    useEffect(() => {
        let updatedPlanes;
        const classroomPlane = { id: "classroomSession", name: "Théorique", immatriculation: "classroomSession", operational: true, clubID: currentUser?.clubID as string, classes: 3, hobbsTotal: null, ownerID: null, usageTypes: [], maintenanceHistory: null, imagePath: null };

        if (instructor === "nothing") {
            updatedPlanes = allPlanes;
        } else {
            updatedPlanes = allPlanes.filter(plane =>
                // Sa propre machine reste proposable quel que soit l'instructeur :
                // elle n'appartient pas à l'offre du créneau.
                isOwnPlane(plane.id) ||
                sessions.some(session => session.pilotID === instructor && sessionOffersPlane(session.planeID, plane.id, planesProp))
            );
        }

        const hasClassroomSession = sessions.some(session => (session.pilotID === instructor || instructor === "nothing") && session.studentID === null && session.planeID.includes("classroomSession"));

        if (hasClassroomSession || (instructor === "nothing" && hasClassroomSession)) {
            updatedPlanes = [...updatedPlanes, classroomPlane];
        }
        setAvailablePlanes(updatedPlanes);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instructor, allPlanes, sessions]);

    useEffect(() => {
        setAvailableInstructors(
            // Avec sa propre machine, tous les instructeurs du créneau restent
            // possibles : le choix de la machine ne dépend plus de leur offre.
            plane === "nothing" || isOwnPlane(plane)
                ? allInstructors
                : allInstructors.filter(instructor =>
                    sessions.some(session => sessionOffersPlane(session.planeID, plane, planesProp) && session.pilotID === instructor.id)
                )
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plane, allInstructors, sessions]);

    const onSubmit = async () => {
        if (!session) {
            setError("Erreur : Impossible de récupérer les informations de la session.");
            return;
        }

        try {
            setLoading(true);
            const res = await studentRegistration(session, currentUser as User, plane, currentClub as Club, new Date().getTimezoneOffset() as number, studentComment as string);
            if (res.error) {
                toast({
                    title: "Erreur",
                    description: res.error,
                    variant: "destructive",
                });
                setError(res.error);
            } else if (res.success) {
                toast({
                    title: "Succès",
                    description: res.success,
                    className: "bg-green-600 text-white border-none",
                });
                setIsOpen(false);
                setSessions(prev =>
                    prev.map(s =>
                        s.id === session.id
                            ? { ...s, studentID: currentUser!.id, studentFirstName: currentUser!.firstName, studentLastName: currentUser!.lastName, studentPlaneID: plane, studentComment }
                            : s
                    )
                );

                // Notifications logic (kept as is)
                const endDate = new Date(session!.sessionDateStart);
                endDate.setUTCMinutes(endDate.getUTCMinutes() + session!.sessionDateDuration_min);
                const instructorFull = usersProps.find(user => user.id === session.pilotID);
                const planeName = plane === "classroomSession" ? "Théorique" :
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
            setError("Une erreur technique est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!sessions.length) return null;

    const startDate = new Date(sessions[0].sessionDateStart);
    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getMinutes() + sessions[0].sessionDateDuration_min);

    // --- 2. UI REFONTE ---
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white rounded-xl shadow-2xl p-0 gap-0 overflow-hidden !flex !flex-col">
                {/* Header Unifié */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex-shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-800">Détails du créneau</DialogTitle>
                        <DialogDescription className="hidden">Information de session</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex flex-col gap-2">
                        <SessionHeader sessionStartDate={startDate} />
                        <SessionDate startDate={startDate} endDate={endDate} />
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {/* Baptême en attente : validable ici comme en page
                        Club, avec les mêmes droits (pilote assigné ou
                        gestion). Placé hors du branchement par rôle pour
                        rester visible du pilote non gestionnaire. */}
                    <BaptemeSessionValidation
                        sessions={sessions}
                        setSessions={setSessions}
                        open={isOpen}
                    />

                    {/* MODE ADMIN / OWNER / INSTRUCTOR / MANAGER : UPDATE */}
                    {["ADMIN", "OWNER", "INSTRUCTOR", "MANAGER"].includes(currentUser?.role as string) ? (
                        <SessionPopupUpdate
                            sessions={sessions}
                            setSessions={setSessions}
                            usersProps={usersProps}
                            planesProp={filterdPlanes}
                        />
                    ) : noSessions ? (

                        // --- MODE LECTURE (SESSIONS DÉJÀ RÉSERVÉES) ---
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Vols confirmés</h3>
                            <div className={cn(
                                "grid gap-3",
                                sessions.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                            )}>
                                {sessions.map((s, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#774BBE]" />

                                        {/* Ligne 1: Pilote & Élève */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                                                    <LiaChalkboardTeacherSolid className="text-[#774BBE]" size={16} />
                                                    <span>{s.pilotLastName.toUpperCase()} {s.pilotFirstName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                    <PiStudent className="text-slate-400" size={16} />
                                                    <span>{s.studentLastName?.toUpperCase()} {s.studentFirstName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <SessionContacts session={s} usersProps={usersProps} />

                                        <div className="w-full h-px bg-slate-100 my-2" />

                                        {/* Ligne 2: Avion & Notes */}
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                                <Plane size={14} />
                                                <span>
                                                    {s.studentPlaneID === "classroomSession" ? "Théorique" :
                                                        s.studentPlaneID === LEGACY_NO_PLANE_ID ? "Sans appareil" :
                                                            planesProp.find((plane) => plane.id === s.studentPlaneID)?.name}
                                                </span>
                                            </div>

                                            <ShowCommentSession
                                                session={s}
                                                setSessions={setSessions}
                                                usersProp={usersProps}
                                            >
                                                <div className={cn(
                                                    "flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded",
                                                    (s.pilotComment || s.studentComment) ? "text-[#774BBE] bg-purple-50 hover:bg-purple-100" : "text-slate-400 hover:text-slate-600"
                                                )}>
                                                    <MessageSquareMore size={14} />
                                                    <span className="font-medium">
                                                        {(s.pilotComment && s.studentComment) ? "2" : (s.pilotComment || s.studentComment) ? "1" : "0"}
                                                    </span>
                                                </div>
                                            </ShowCommentSession>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    ) : (

                        // --- MODE RÉSERVATION (STUDENT) ---
                        <div className="space-y-6">
                            {/* Section Configuration */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-6 h-px bg-slate-300"></span>
                                    Configuration du vol
                                    <span className="flex-1 h-px bg-slate-300"></span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-600">Avec quel instructeur ?</Label>
                                        <InstructorSelect
                                            instructors={availableInstructors}
                                            selectedInstructor={instructor}
                                            onInstructorChange={setInstructor}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-600">Sur quel appareil ?</Label>
                                        <PlaneSelect
                                            planes={availablePlanes}
                                            selectedPlane={plane}
                                            onPlaneChange={setPlane}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section Notes */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-6 h-px bg-slate-300"></span>
                                    Instructions & Notes
                                    <span className="flex-1 h-px bg-slate-300"></span>
                                </h3>

                                <div className="grid gap-4">
                                    {/* Note Instructeur (Lecture seule) */}
                                    {(session && session.pilotComment) && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1">
                                            <Label className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                                                <AlertCircle size={12} /> Note de l&apos;instructeur
                                            </Label>
                                            <p className="text-sm text-amber-900/80 italic">
                                                &quot;{session.pilotComment}&quot;
                                            </p>
                                        </div>
                                    )}

                                    {/* Note Étudiant (Saisie) */}
                                    {session && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-600">Votre message pour l&apos;instructeur (optionnel)</Label>
                                            <Textarea
                                                value={studentComment}
                                                onChange={(e) => setStudentComment(e.target.value)}
                                                placeholder="Objectifs de la séance, questions..."
                                                className="bg-slate-50 border-slate-200 focus:border-[#774BBE] min-h-[80px]"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-100">
                                <SubmitButton
                                    submitDisabled={submitDisabled}
                                    onSubmit={onSubmit}
                                    loading={loading}
                                    error={error}
                                    disabledMessage={disabledMessage}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;