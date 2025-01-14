
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@nextui-org/modal";
import React, { useEffect, useState } from 'react'
import { RiDeleteBin5Fill } from "react-icons/ri";
import { Button } from "./ui/button";
import { DatePicker, DateRangePicker } from "@nextui-org/date-picker";
import { DateValue, getLocalTimeZone, parseAbsoluteToLocal } from "@internationalized/date";
import type { RangeValue } from "@react-types/shared";
import { Label } from "./ui/label";
import { CheckboxGroup, Checkbox } from "@nextui-org/checkbox";
import { IoIosWarning } from "react-icons/io";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { userRole } from "@prisma/client";
import { removeSessionsByID } from "@/api/db/sessions";
import { findSessions } from "@/api/client/sessions";

const DeleteManySessions = () => {
    const { currentUser } = useCurrentUser()
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    let [date, setDate] = useState<RangeValue<DateValue> | null>();
    const [groupSelected, setGroupSelected] = useState(["oneTime"]);
    const [endDelete, setEndDelete] = useState<DateValue | null>();
    const [error, setError] = useState("")

    useEffect(() => {
        if (groupSelected.length > 1) {
            // Garde uniquement le dernier élément ajouté
            setGroupSelected([groupSelected[groupSelected.length - 1]]);
        }
    }, [groupSelected]);

    if (!(currentUser?.role.includes(userRole.ADMIN) || currentUser?.role.includes(userRole.OWNER) || currentUser?.role.includes(userRole.PILOT) || currentUser?.role.includes(userRole.INSTRUCTOR))) {
        return null
    }

    const onValidate = (onClose: () => void) => {
        console.log("onValidate");

        const findParams: findSessions = {
            clubID: currentUser?.clubID as string,
            piloteID: currentUser?.id as string,
            reccurence: groupSelected,
            startDelete: date?.start.toDate(getLocalTimeZone()) as Date,
            endDelete: date?.end.toDate(getLocalTimeZone()) as Date,
            endReccurence: endDelete?.toDate(getLocalTimeZone()),
        };


        // Fermer la modal après validation
        // onClose(); // Exécution correcte de onClose

        // removeSessionsByID();
        const res = findSessions(findParams);
        if (res?.error) {
            setError(res.error);
        }
        else {
            setError("");
        }
    };


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
                                <p className="font-normal text-gray-600 text-sm">Configuration de la suppression</p>
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

                                {/* Choix de la récurrence */}
                                <div>
                                    <Label>Récurrence de la suppression</Label>
                                    <CheckboxGroup
                                        color="secondary"
                                        orientation="horizontal"
                                        value={groupSelected}
                                        isRequired
                                        onChange={setGroupSelected}
                                        aria-label="Choisir la récurrence de la suppression"
                                    >
                                        <Checkbox value="oneTime" aria-label="Suppression unique">Suppression Unique</Checkbox>
                                        <Checkbox value="Weekly" aria-label="Suppression hebdomadaire">Toutes les semaines</Checkbox>
                                        <Checkbox value="Monthly" aria-label="Suppression mensuelle">Tous les mois</Checkbox>
                                    </CheckboxGroup>
                                </div>

                                {/* Fin de la récurrence */}
                                {groupSelected.includes("Weekly") || groupSelected.includes("Monthly") ? (
                                    <div>
                                        <Label>Fin de la récurrence</Label>
                                        <DatePicker
                                            className="w-full"
                                            value={endDelete}
                                            onChange={setEndDelete}
                                            aria-label="Sélectionner la date de fin de la récurrence"
                                        />
                                    </div>
                                ) : null}

                                {/* Résumé */}
                                <div>
                                    <Label>Résumé</Label>
                                    <div className="flex flex-row w-full text-sm rounded-lg p-2">
                                        <p>Suppression de tous les vols de la session suivante</p>
                                    </div>
                                </div>

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
                                    onClick={onClose}
                                    aria-label="Fermer la fenêtre de suppression"
                                >
                                    Fermer
                                </Button>

                                <Button
                                    color="primary"
                                    onClick={() => onValidate(onClose)}
                                    aria-label="Valider la suppression"
                                >
                                    Action
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
