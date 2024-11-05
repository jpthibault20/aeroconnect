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
import { getAllFutureSessions, removeSessionsByID } from '@/api/db/sessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { flight_sessions } from '@prisma/client';
import NewSession from '../NewSession';
import { Spinner } from '../ui/SpinnerVariants';
import { Button } from '../ui/button';
import AlertConfirmDeleted from '../AlertConfirmDeleted';

/**
 * @component PlanePageComponent
 * @description Component for managing and displaying flight sessions.
 * 
 * @returns  The rendered component.
 */
const FlightsPageComponent = () => {
    const [sessionChecked, setSessionChecked] = useState<string[]>([]);
    const [filterAvailable, setFilterAvailable] = useState(false);
    const [filterReccurence, setFilterReccurence] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [sessions, setSessions] = useState<flight_sessions[]>([]);
    const [filteredSessions, setFilteredSessions] = useState(sessions); // State for filtered sessions
    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(false);
    const { currentUser } = useCurrentUser();

    useEffect(() => {
        const fetchSessions = async () => {
            if (currentUser) {
                setLoading(true);
                try {
                    const res = await getAllFutureSessions(currentUser.clubID);
                    if (Array.isArray(res)) {
                        // Trier les sessions par ordre chronologique
                        const sortedSessions = res.sort((a, b) =>
                            new Date(a.sessionDateStart).getTime() - new Date(b.sessionDateStart).getTime()
                        );
                        setSessions(sortedSessions);
                        setLoading(false);
                    } else {
                        console.log('Unexpected response format:', res);
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        };

        fetchSessions();
    }, [currentUser, reload]);

    // Logic for filtering sessions based on selected filters
    useEffect(() => {
        const filtered = sessions.filter(session => {
            let isValid = true;

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
    }, [filterAvailable, filterReccurence, filterDate, sessions]); // Recalculate filters when any filter changes

    const removeFlight = (sessions: string[]) => {
        const removeSessions = async () => {
            if (sessions.length > 0) {
                setLoading(true);
                try {
                    await removeSessionsByID(sessions);
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                    setReload(!reload);
                }
            }
        };

        removeSessions();
    }

    /**
     * Function to check if a given value is a valid date.
     * 
     * @param date - The value to check.
     * @returns {boolean} True if valid date, otherwise false.
     */
    const isValidDate = (date: unknown): boolean => {
        return date instanceof Date && !isNaN(date.getTime());
    };

    return (
        <div className='h-full'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les vols</p>
                <p className='text-[#797979] text-3xl'>{filteredSessions.length}</p>
            </div>
            <div className='my-3 flex justify-between'>
                <div className='flex space-x-3'>
                    <AlertConfirmDeleted
                        title="Etes vous sur de vouloir supprimer ces vols ?"
                        description={sessionChecked.length > 1 ? `${sessionChecked.length} vols seront supprimés.` : `1 vol sera supprimé.`}
                        cancel='Annuler'
                        confirm='Supprimer'
                        confirmAction={() => removeFlight(sessionChecked)}
                        loading={loading}
                    >
                        <Button className='bg-red-700 hover:bg-red-800 text-white'>Supprimer</Button>
                    </AlertConfirmDeleted>

                    <div className='hidden lg:block h-full'>
                        <NewSession display={'desktop'} reload={reload} setReload={setReload} />
                    </div>
                    <div className='lg:hidden block'>
                        <NewSession display={'phone'} reload={reload} setReload={setReload} />
                    </div>

                </div>
                <Filter
                    filterAvailable={filterAvailable}
                    filterReccurence={filterReccurence}
                    filterDate={filterDate}
                    setFilterAvailable={setFilterAvailable}
                    setFilterReccurence={setFilterReccurence}
                    setFilterDate={setFilterDate}
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
                    setSessionChecked={setSessionChecked}
                    reload={reload}
                    setReload={setReload}
                />
            )}
        </div>
    );
};

export default FlightsPageComponent;
