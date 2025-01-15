/* eslint-disable @typescript-eslint/no-unused-vars */

import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@nextui-org/modal";
import React, { useEffect, useState } from 'react'
import { RiDeleteBin5Fill } from "react-icons/ri";
import { Button } from "./ui/button";
import { DatePicker, DateRangePicker } from "@nextui-org/date-picker";
import { DateValue, getLocalTimeZone } from "@internationalized/date";
import type { RangeValue } from "@react-types/shared";
import { Label } from "./ui/label";
import { IoIosWarning } from "react-icons/io";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Club, flight_sessions, User, userRole } from "@prisma/client";
import { Select, SelectItem } from "@nextui-org/select";
import { removeSessionsByID } from "@/api/db/sessions";
import { sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from "@/lib/mail";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { toast } from "@/hooks/use-toast";


interface Prop {
    usersProps: User[];
    sessionsProps: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
}

const DeleteManySessions = ({ usersProps, sessionsProps, setSessions }: Prop) => {
    const { currentUser } = useCurrentUser()
    const { currentClub } = useCurrentClub()
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [date, setDate] = useState<RangeValue<DateValue> | null>();
    const [piloteID, setPiloteID] = useState<string | undefined>(currentUser?.id);
    const [error, setError] = useState("");
    const [sessionsToDelete, setSessionsToDelete] = useState<flight_sessions[]>([]);

    useEffect(() => {
        if (!date?.start || !date?.end || !piloteID) return;

        const sessions = sessionsProps.filter((session) => {
            if (piloteID !== session.pilotID) {
                return false;
            }

            const sessionDate = new Date(session.sessionDateStart);
            const startDate = date.start.toDate(getLocalTimeZone());
            const endDate = date.end.toDate(getLocalTimeZone());

            return sessionDate > startDate && sessionDate <= endDate;
        });

        setSessionsToDelete(sessions);
    }, [date?.end, date?.start, piloteID, sessionsProps]);

    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT) || currentUser?.role.includes(userRole.INSTRUCTOR))) {
        return null
    }

    const onValidate = async (onClose: () => void) => {
        console.log("onValidate");

        const sessionsIDs = sessionsToDelete.map(session => session.id);
        const res = await removeSessionsByID(sessionsIDs);

        if (res.error) {
            setError(res.error);
            return;
        }

        for (const session of sessionsToDelete) {
            if (session.studentID) {
                const student = usersProps.find(item => item.id === session.studentID)
                const pilote = usersProps.find(item => item.id === session.pilotID)

                const endDate = new Date(session.sessionDateStart);
                endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

                Promise.all([
                    sendNotificationRemoveAppointment(student?.email as string, session.sessionDateStart as Date, endDate as Date, currentClub as Club),
                    sendNotificationSudentRemoveForPilot(pilote?.email as string, session.sessionDateStart as Date, endDate as Date, currentClub as Club),
                ])
                    .catch((error) => {
                        console.log(error);
                    });
            }
        }
        toast({
            title: res.success,
            duration: 5000,
            style: {
                background: '#0bab15', //rouge : ab0b0b
                color: '#fff',
            }
        });

        setSessions((prev) => prev.filter(session => !sessionsIDs.includes(session.id)));
        setSessionsToDelete([]);
        onClose();
    };

    const backToPage = (onClose: () => void) => {
        setError("");
        onClose();
    }


    return (
        <>
            <button
                className="bg-red-600 flex flex-1 items-center justify-center px-3 rounded-lg hover:bg-red-700 transition"
                onClick={onOpen}
                aria-label="Ouvrir la fenêtre de suppression"
            >
                <RiDeleteBin5Fill color="white" size={15} />
            </button>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} aria-label="Fenêtre de suppression de sessions">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col">
                                <h1>Suppression de plusieurs sessions</h1>
                                <p className="font-normal text-gray-600 text-sm">Configuration des sessions à suppression</p>
                            </ModalHeader>

                            <ModalBody>
                                {/* Plage de suppression */}
                                <div>
                                    <Label>Plage de suppression</Label>
                                    <DateRangePicker
                                        popoverProps={{
                                            placement: "top"
                                        }}
                                        fullWidth
                                        hideTimeZone
                                        granularity="hour"
                                        label="Sélectionner une plage de dates"
                                        value={date}
                                        onChange={setDate}
                                        aria-label="Sélectionner une plage de dates pour la suppression"
                                    />
                                </div>

                                {currentUser.role === userRole.ADMIN || currentUser.role === userRole.OWNER ?
                                    (
                                        <div>
                                            <Label>Instructeur</Label>
                                            <Select
                                                label="Instructeurs"
                                                selectedKeys={piloteID ? [piloteID] : []}
                                                onSelectionChange={(value) => setPiloteID(Array.from(value)[0]?.toString())}
                                            >
                                                {usersProps.map((user) => {
                                                    if (user.role === userRole.INSTRUCTOR ||
                                                        user.role === userRole.ADMIN ||
                                                        user.role === userRole.OWNER) {
                                                        const displayText = `${user.lastName.toUpperCase().slice(0, 1)}.${user.firstName}`;
                                                        return (
                                                            <SelectItem
                                                                key={user.id}
                                                                value={user.id}
                                                                textValue={displayText} // Ajout de textValue pour l'accessibilité
                                                            >
                                                                {displayText}
                                                            </SelectItem>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </Select>
                                        </div>
                                    ) : null}
                                {/* Message d'erreur */}
                                {error && (
                                    <div className="flex items-center text-destructive mb-4" aria-live="assertive">
                                        <IoIosWarning className="mr-2" aria-hidden="true" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </ModalBody>

                            {/* Boutons de validation */}
                            <ModalFooter>
                                <Button
                                    color="danger"
                                    variant="link"
                                    onClick={() => backToPage(onClose)}
                                    aria-label="Fermer la fenêtre de suppression"
                                >
                                    Fermer
                                </Button>

                                <Button
                                    className="bg-red-700"
                                    onClick={() => onValidate(onClose)}
                                    aria-label="Valider la suppression"
                                    disabled={sessionsToDelete.length === 0 || !date}
                                >
                                    {sessionsToDelete.length > 0 ? `Supprimer ${sessionsToDelete.length} session${sessionsToDelete.length > 1 ? 's' : ''}` : 'Action'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

        </>
    )
}

export default DeleteManySessions
