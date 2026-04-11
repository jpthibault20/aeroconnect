import React, { useState, useEffect } from "react";
import { DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Club, flight_logs, flight_sessions, planes, User } from "@prisma/client";
import { Dialog } from "./ui/dialog";
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
import { MessageSquareMore, Plane, User as AlertCircle, ArrowLeft, MapPin, Gauge, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { PiStudent } from "react-icons/pi";
import { LiaChalkboardTeacherSolid } from "react-icons/lia";
import SessionPopupUpdate from "./SessionPopupUpdate";
import { getFlightLogBySession, getPlaneHobbs, autoCreateLogsFromSessions, updateFlightLog, signFlightLog } from "@/api/db/logbook";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Spinner } from "./ui/SpinnerVariants";
import ShowCommentSession from "./ShowCommentSession";
import { cn } from "@/lib/utils";

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

    // Post-vol state (formulaire inline dans le même dialog)
    const [postFlightLog, setPostFlightLog] = useState<flight_logs | null>(null);
    const [postFlightLoading, setPostFlightLoading] = useState(false);
    const [postFlightSigning, setPostFlightSigning] = useState(false);
    const [pfDeparture, setPfDeparture] = useState("");
    const [pfArrival, setPfArrival] = useState("");
    const [pfTakeoffs, setPfTakeoffs] = useState(1);
    const [pfLandings, setPfLandings] = useState(1);
    const [pfHobbsStart, setPfHobbsStart] = useState("");
    const [pfHobbsEnd, setPfHobbsEnd] = useState("");
    const [pfFuel, setPfFuel] = useState("");
    const [pfOil, setPfOil] = useState("");
    const [pfAnomalies, setPfAnomalies] = useState("RAS");
    const [pfRemarks, setPfRemarks] = useState("");

    const handleOpenPostFlight = async (flightSession: flight_sessions) => {
        if (currentClub?.id) {
            await autoCreateLogsFromSessions(currentClub.id);
        }

        const res = await getFlightLogBySession(flightSession.id, flightSession.pilotID);
        if ("error" in res || !res.log) {
            toast({
                title: "Aucun enregistrement de vol",
                description: "Le carnet de vol n'a pas encore été généré pour cette session.",
                variant: "destructive",
            });
            return;
        }

        const log = res.log;
        const defaultAirfield = currentClub?.id ?? "";

        // Pré-remplir le formulaire
        setPfDeparture(log.departureAirfield ?? defaultAirfield);
        setPfArrival(log.arrivalAirfield ?? defaultAirfield);
        setPfTakeoffs(log.takeoffs);
        setPfLandings(log.landings);

        let hobbsDefault = "";
        if (log.hobbsStart != null) {
            hobbsDefault = String(log.hobbsStart);
        } else if (log.planeID) {
            const hobbs = await getPlaneHobbs(log.planeID);
            if (hobbs != null) hobbsDefault = String(hobbs);
        }
        setPfHobbsStart(hobbsDefault);
        setPfHobbsEnd(log.hobbsEnd != null ? String(log.hobbsEnd) : "");
        setPfFuel(log.fuelAdded != null ? String(log.fuelAdded) : "");
        setPfOil(log.oilAdded != null ? String(log.oilAdded) : "");
        setPfAnomalies(log.anomalies ?? "RAS");
        setPfRemarks(log.remarks ?? "");

        setPostFlightLog(log);
    };

    const handlePostFlightBack = () => {
        setPostFlightLog(null);
    };

    const handlePostFlightSave = async (andSign: boolean) => {
        if (!postFlightLog) return;

        const pfHasPlane = !!postFlightLog.planeID;
        if (pfHasPlane) {
            if (andSign) {
                if (!pfHobbsStart || isNaN(parseFloat(pfHobbsStart))) {
                    toast({ title: "Erreur", description: "Les heures moteur de début sont obligatoires pour signer.", variant: "destructive" });
                    return;
                }
                if (!pfHobbsEnd || isNaN(parseFloat(pfHobbsEnd)) || parseFloat(pfHobbsEnd) <= parseFloat(pfHobbsStart)) {
                    toast({ title: "Erreur", description: "Les heures moteur de fin doivent être supérieures à celles de début.", variant: "destructive" });
                    return;
                }
            } else if (pfHobbsStart && pfHobbsEnd && parseFloat(pfHobbsEnd) <= parseFloat(pfHobbsStart)) {
                toast({ title: "Erreur", description: "Les heures moteur de fin doivent être supérieures à celles de début.", variant: "destructive" });
                return;
            }
        }

        if (andSign) setPostFlightSigning(true);
        else setPostFlightLoading(true);

        try {
            const res = await updateFlightLog(postFlightLog.id, {
                departureAirfield: pfDeparture || undefined,
                arrivalAirfield: pfArrival || undefined,
                takeoffs: pfTakeoffs,
                landings: pfLandings,
                hobbsStart: pfHobbsStart ? parseFloat(pfHobbsStart) : undefined,
                hobbsEnd: pfHobbsEnd ? parseFloat(pfHobbsEnd) : undefined,
                fuelAdded: pfFuel ? parseFloat(pfFuel) : undefined,
                oilAdded: pfOil ? parseFloat(pfOil) : undefined,
                anomalies: pfAnomalies || "RAS",
                remarks: pfRemarks || undefined,
            });

            if ("error" in res) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
                return;
            }

            if (andSign) {
                const signRes = await signFlightLog(postFlightLog.id);
                if ("error" in signRes) {
                    toast({ title: "Erreur signature", description: signRes.error, variant: "destructive" });
                    return;
                }
            }

            toast({
                title: andSign ? "Vol complété et signé" : "Vol mis à jour",
                className: "bg-green-600 text-white border-none",
            });
            setPostFlightLog(null);
        } catch {
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setPostFlightLoading(false);
            setPostFlightSigning(false);
        }
    };

    const filterdPlanes = planesProp.filter((p) => currentUser?.classes.includes(p.classes))

    // --- 1. LOGIC & EFFECTS (Inchangés pour garantir le fonctionnement) ---
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
        const classroomPlane = { id: "classroomSession", name: "Théorique", immatriculation: "classroomSession", operational: true, clubID: currentUser?.clubID as string, classes: 3, hobbsTotal: null };

        if (instructor === "nothing") {
            updatedPlanes = allPlanes;
        } else {
            updatedPlanes = allPlanes.filter(plane =>
                sessions.some(session => session.pilotID === instructor && session.planeID.includes(plane.id))
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
            plane === "nothing" || plane === "noPlane"
                ? allInstructors
                : allInstructors.filter(instructor =>
                    sessions.some(session => session.planeID.includes(plane) && session.pilotID === instructor.id)
                )
        );
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
            setError("Une erreur technique est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!sessions.length) return null;

    const startDate = new Date(sessions[0].sessionDateStart);
    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getMinutes() + sessions[0].sessionDateDuration_min);

    const pfIsSigned = postFlightLog?.pilotSigned ?? false;

    const postFlightCompanion = postFlightLog
        ? postFlightLog.pilotFunction === "I"
            ? `Élève : ${postFlightLog.studentFirstName ?? ""} ${postFlightLog.studentLastName ?? ""}`.trim()
            : postFlightLog.pilotFunction === "EP"
                ? `Instructeur : ${postFlightLog.instructorFirstName ?? ""} ${postFlightLog.instructorLastName ?? ""}`.trim()
                : ""
        : "";

    // --- 2. UI REFONTE ---
    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setPostFlightLog(null);
        }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white rounded-xl shadow-2xl p-0 gap-0 overflow-hidden !flex !flex-col">

                {postFlightLog ? (
                    /* ─── MODE POST-VOL ─── */
                    (() => {
                        const pfInputClass = pfIsSigned
                            ? "bg-slate-100 border-slate-200 text-slate-500 cursor-default"
                            : "bg-slate-50 border-slate-200";
                        return (
                        <>
                        {/* Header */}
                        <div className={`${pfIsSigned ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"} p-4 sm:p-6 border-b flex-shrink-0`}>
                            <DialogHeader>
                                <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    <button onClick={handlePostFlightBack} className="p-2 hover:bg-slate-200/60 rounded-lg transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                                    </button>
                                    <div className={`p-2 ${pfIsSigned ? "bg-emerald-100" : "bg-[#774BBE]/10"} rounded-lg`}>
                                        {pfIsSigned
                                            ? <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                            : <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#774BBE]" />
                                        }
                                    </div>
                                    {pfIsSigned ? "Vol signé" : "Compléter le vol"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 ml-[5.5rem] text-xs sm:text-sm">
                                    {new Date(postFlightLog.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                                    {" — "}{postFlightLog.planeName} ({postFlightLog.planeRegistration})
                                    {" — "}{`${Math.floor(postFlightLog.durationMinutes / 60)}h${String(postFlightLog.durationMinutes % 60).padStart(2, "0")}`}
                                    {postFlightCompanion && <><br />{postFlightCompanion}</>}
                                </DialogDescription>
                            </DialogHeader>
                            {pfIsSigned && postFlightLog.pilotSignedAt && (
                                <div className="mt-2 ml-[5.5rem] flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Signé le {new Date(postFlightLog.pilotSignedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                </div>
                            )}
                        </div>

                        {/* Body — scrollable, grisé si signé */}
                        <div className={`p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0 ${pfIsSigned ? "opacity-60" : ""}`}>
                            {/* Aérodromes */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Aérodromes
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Départ (OACI)</Label>
                                        <Input value={pfDeparture} onChange={(e) => setPfDeparture(e.target.value.toUpperCase())} placeholder="LFXX" readOnly={pfIsSigned} className={`font-mono uppercase text-sm ${pfInputClass}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Arrivée (OACI)</Label>
                                        <Input value={pfArrival} onChange={(e) => setPfArrival(e.target.value.toUpperCase())} placeholder="LFXX" readOnly={pfIsSigned} className={`font-mono uppercase text-sm ${pfInputClass}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Mouvements */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Plane className="w-3.5 h-3.5" /> Mouvements
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Décollages</Label>
                                        <Input type="number" min={0} value={pfTakeoffs} onChange={(e) => setPfTakeoffs(parseInt(e.target.value) || 0)} readOnly={pfIsSigned} className={`text-sm ${pfInputClass}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Atterrissages</Label>
                                        <Input type="number" min={0} value={pfLandings} onChange={(e) => setPfLandings(parseInt(e.target.value) || 0)} readOnly={pfIsSigned} className={`text-sm ${pfInputClass}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Machine — masqué si pas d'avion */}
                            {!!postFlightLog.planeID && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Gauge className="w-3.5 h-3.5" /> Machine
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Heures moteur début</Label>
                                        <Input type="number" step="0.1" value={pfHobbsStart} onChange={(e) => setPfHobbsStart(e.target.value)} placeholder="0.0" readOnly={pfIsSigned} className={`font-mono text-sm ${pfInputClass}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Heures moteur fin</Label>
                                        <Input type="number" step="0.1" value={pfHobbsEnd} onChange={(e) => setPfHobbsEnd(e.target.value)} placeholder="0.0" readOnly={pfIsSigned} className={`font-mono text-sm ${pfInputClass}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Carburant ajouté (L)</Label>
                                        <Input type="number" step="0.1" value={pfFuel} onChange={(e) => setPfFuel(e.target.value)} placeholder="0.0" readOnly={pfIsSigned} className={`text-sm ${pfInputClass}`} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Huile ajoutée (L)</Label>
                                        <Input type="number" step="0.01" value={pfOil} onChange={(e) => setPfOil(e.target.value)} placeholder="0.0" readOnly={pfIsSigned} className={`text-sm ${pfInputClass}`} />
                                    </div>
                                </div>
                            </div>
                            )}

                            {/* Anomalies */}
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Anomalies constatées</Label>
                                <Textarea value={pfAnomalies} onChange={(e) => setPfAnomalies(e.target.value)} placeholder="RAS" readOnly={pfIsSigned} className={`text-sm min-h-[60px] ${pfInputClass}`} />
                            </div>

                            {/* Remarques */}
                            <div className="space-y-1">
                                <Label className="text-slate-600 text-xs">Remarques / observations</Label>
                                <Textarea value={pfRemarks} onChange={(e) => setPfRemarks(e.target.value)} placeholder="Remarques sur le vol..." readOnly={pfIsSigned} className={`text-sm min-h-[60px] ${pfInputClass}`} />
                            </div>
                        </div>

                        {/* Footer */}
                        <DialogFooter className={`${pfIsSigned ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"} p-4 sm:p-6 border-t flex-shrink-0 flex-col sm:flex-row gap-2`}>
                            {pfIsSigned ? (
                                <Button onClick={() => setIsOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                                    Fermer
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" onClick={handlePostFlightBack} disabled={postFlightLoading || postFlightSigning} className="text-slate-500 hover:text-slate-700 w-full sm:w-auto">
                                        Plus tard
                                    </Button>
                                    <Button onClick={() => handlePostFlightSave(false)} disabled={postFlightLoading || postFlightSigning} variant="outline" className="border-slate-200 w-full sm:w-auto">
                                        {postFlightLoading ? <Spinner className="w-4 h-4" /> : "Enregistrer"}
                                    </Button>
                                    <Button onClick={() => handlePostFlightSave(true)} disabled={postFlightLoading || postFlightSigning} className="bg-[#774BBE] hover:bg-[#6538a5] text-white w-full sm:w-auto">
                                        {postFlightSigning ? (
                                            <div className="flex items-center gap-2"><Spinner className="w-4 h-4 text-white" /><span>Signature...</span></div>
                                        ) : (
                                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Enregistrer et signer</span></div>
                                        )}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                        </>
                        );
                    })()
                ) : (
                    /* ─── MODE NORMAL (session) ─── */
                    <>
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
                            {/* MODE ADMIN / OWNER / INSTRUCTOR / MANAGER : UPDATE */}
                            {["ADMIN", "OWNER", "INSTRUCTOR", "MANAGER"].includes(currentUser?.role as string) ? (
                                <SessionPopupUpdate
                                    sessions={sessions}
                                    setSessions={setSessions}
                                    usersProps={usersProps}
                                    planesProp={filterdPlanes}
                                    onOpenPostFlight={handleOpenPostFlight}
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

                                                <div className="w-full h-px bg-slate-100 my-2" />

                                                {/* Ligne 2: Avion & Notes */}
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2 py-1 rounded">
                                                        <Plane size={14} />
                                                        <span>
                                                            {s.studentPlaneID === "classroomSession" ? "Théorique" :
                                                                s.studentPlaneID === "noPlane" ? "Sans appareil" :
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
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SessionPopup;