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
import { flightsSessionsExemple } from '@/config/exempleData';
import { Button } from '@/components/ui/button';
import Filter from '@/components/flights/Filter';

/**
 * @component PlanePageComponent
 * @description Component for managing and displaying flight sessions.
 * 
 * @returns  The rendered component.
 */
const FlightsPageComponent = () => {
    const [sessionChecked, setSessionChecked] = useState<number[]>([]);
    const [filterAvailable, setFilterAvailable] = useState(false);
    const [filterReccurence, setFilterReccurence] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [filteredSessions, setFilteredSessions] = useState(flightsSessionsExemple); // State for filtered sessions

    // Logic for filtering sessions based on selected filters
    useEffect(() => {
        const filtered = flightsSessionsExemple.filter(session => {
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
    }, [filterAvailable, filterReccurence, filterDate]); // Recalculate filters when any filter changes

    // Log selected session IDs when they change
    useEffect(() => {
        console.log(sessionChecked);
    }, [sessionChecked]);

    /**
     * Function to check if a given value is a valid date.
     * 
     * @param date - The value to check.
     * @returns {boolean} True if valid date, otherwise false.
     */
    const isValidDate = (date: unknown): boolean => {
        return date instanceof Date && !isNaN(date.getTime());
    };

    const onClickAction = () => {
        console.log("action");
    };

    const onClickNewSession = () => {
        console.log("new session");
    };

    return (
        <div className='h-full'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les vols</p>
                <p className='text-[#797979] text-3xl'>{filteredSessions.length}</p>
            </div>
            <div className='my-3 flex justify-between'>
                <div className='flex space-x-3'>
                    <Button onClick={onClickAction} className='bg-[#774BBE] hover:bg-[#3d2365]'>
                        Action
                    </Button>
                    <Button onClick={onClickNewSession} className='bg-[#774BBE] hover:bg-[#3d2365]'>
                        Nouveau
                    </Button>
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
            <TableComponent
                sessions={filteredSessions} // Pass filtered sessions here
                setSessionChecked={setSessionChecked}
            />
        </div>
    );
};

export default FlightsPageComponent;
