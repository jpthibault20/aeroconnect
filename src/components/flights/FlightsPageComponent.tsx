/**
 * @file PlanePageComponent.tsx
 * @brief Component for displaying flight sessions and filters.
 * 
 * @details
 * This component handles the display of flight sessions, allows filtering
 * options, and manages session selection.
 */

"use client";
import React, { useEffect, useState } from 'react';
import TableComponent from "@/components/flights/TableComponent";
import Filter from '@/components/flights/Filter';
import { removeSessionsByID } from '@/api/db/sessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Club, flight_sessions, planes, User, userRole } from '@prisma/client';
import NewSession from '../NewSession';
import { Spinner } from '../ui/SpinnerVariants';
import { Button } from '../ui/button';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { toast } from '@/hooks/use-toast';

interface Props {
    sessionsProp: flight_sessions[];
    planesProp: planes[];
    usersProp: User[]
    clubProp: Club | null
}

/**
 * @component PlanePageComponent
 * @description Component for managing and displaying flight sessions.
 * 
 * @returns  The rendered component.
 */
const FlightsPageComponent = ({ sessionsProp, planesProp, usersProp, clubProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [sessionChecked, setSessionChecked] = useState<string[]>([]);
    const [filterAvailable, setFilterAvailable] = useState(false);
    const [filterReccurence, setFilterReccurence] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [myFlights, setMyFlights] = useState(false)
    const [sessions, setSessions] = useState<flight_sessions[]>(sessionsProp);
    const [filteredSessions, setFilteredSessions] = useState(sessions); // State for filtered sessions
    const [loading, setLoading] = useState(false);

    // Logic for filtering sessions based on selected filters
    useEffect(() => {
        const filtered = sessions.filter(session => {
            let isValid = true;

            if (myFlights) {
                isValid = isValid && session.pilotID === currentUser?.id;
            }

            // Filter by availability (for example, based on a property like session.isAvailable)
            if (filterAvailable) {
                isValid = isValid && session.studentID === null;
            }

            // Filter by recurrence (for example, if the session has a recurrence)
            if (filterReccurence) {
                isValid = isValid && session.finalReccurence !== null;
            }

            // Filter by date (if a filter date is selected)
            if (isValidDate(filterDate)) {
                const sessionDate = new Date(session.sessionDateStart);
                isValid = isValid && sessionDate.toDateString() === filterDate!.toDateString();
            }

            return isValid;
        });

        setFilteredSessions(filtered); // Update the filtered sessions
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterAvailable, filterReccurence, filterDate, sessions, myFlights]); // Recalculate filters when any filter changes

    const removeFlight = (sessionsParams: string[]) => {
        const removeSessions = async () => {
            if (sessionsParams.length > 0) {
                setLoading(true);
                try {
                    const res = await removeSessionsByID(sessionsParams);
                    if (res.success) {
                        toast({
                            title: res.success,
                            duration: 5000,
                        });
                        setSessionChecked([]);
                        setSessions(sessions.filter(session => !sessionsParams.includes(session.id)));
                    }
                    if (res.error) {
                        toast({
                            title: "Oups, une erreur est survenue",
                            description: res.error,
                            duration: 5000,
                        });
                    }
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                }
            }
        };

        removeSessions();
    }

    const isValidDate = (date: unknown): boolean => {
        return date instanceof Date && !isNaN(date.getTime());
    };

    return (
        <div className='h-full p-6 bg-gray-200'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les vols</p>
                <p className='text-[#797979] text-3xl'>{currentUser?.role !== userRole.USER && filteredSessions.length}</p>
            </div>
            <div className='my-3 flex justify-between'>
                <div className='flex space-x-3'>

                    {currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR || currentUser?.role == userRole.OWNER ?
                        (
                            <AlertConfirmDeleted
                                title="Etes vous sur de vouloir supprimer ces vols ?"
                                description={sessionChecked.length > 1 ? `${sessionChecked.length} vols seront supprimés.` : sessionChecked.length === 1 ? `1 vol sera supprimé.` : `Aucun vol n'a été sélectionné.`}
                                cancel='Annuler'
                                confirm='Supprimer'
                                confirmAction={() => removeFlight(sessionChecked)}
                                loading={loading}
                            >
                                <Button className='bg-red-700 hover:bg-red-800 text-white'>Supprimer</Button>
                            </AlertConfirmDeleted>
                        ) : null
                    }
                    {clubProp ? (
                        <>
                            <div className='hidden lg:block h-full'>
                                <NewSession display={'desktop'} setSessions={setSessions} planesProp={planesProp} club={clubProp} />
                            </div>
                            <div className='lg:hidden block'>
                                <NewSession display={'phone'} setSessions={setSessions} planesProp={planesProp} club={clubProp} />
                            </div>
                        </>
                    ) : null}

                </div>
                <Filter
                    filterAvailable={filterAvailable}
                    filterReccurence={filterReccurence}
                    filterDate={filterDate}
                    myFlights={myFlights}
                    setFilterAvailable={setFilterAvailable}
                    setFilterReccurence={setFilterReccurence}
                    setFilterDate={setFilterDate}
                    setMyFlights={setMyFlights}
                />
            </div>
            {/* Use filtered sessions in the table */}
            {loading ? (
                <div className='justify-center items-center'>
                    <Spinner />
                    <p className='text-center'>
                        Chargement ...
                    </p>
                </div>
            ) : (
                <TableComponent
                    sessions={filteredSessions} // Pass filtered sessions here
                    setSessions={setSessions}
                    setSessionChecked={setSessionChecked}
                    planesProp={planesProp}
                    usersProp={usersProp}
                />
            )}
        </div>
    );
};

export default FlightsPageComponent;
