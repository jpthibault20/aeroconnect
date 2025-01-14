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
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import NewSession from '../NewSession';
import DeleteFlightSession from '../DeleteFlightSession';
import { isSameDay } from 'date-fns';
import { DateValue } from "@internationalized/date";

interface Props {
    sessionsProp: flight_sessions[];
    planesProp: planes[];
    usersProp: User[]
}
export type StatusType = "al" | "available" | "unavailable";


/**
 * @component PlanePageComponent
 * @description Component for managing and displaying flight sessions.
 * 
 * @returns  The rendered component.
 */
const FlightsPageComponent = ({ sessionsProp, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [sessionChecked, setSessionChecked] = useState<flight_sessions[]>([]);
    const [selectedPlane, setSelectedPlane] = useState<string>("al");
    const [filterDate, setFilterDate] = useState<DateValue | null>(null);
    const [selectedInstructor, setSelectedInstructor] = useState<string>("al");
    const [selectedStudents, setSelectedStudents] = useState<string>("al");
    const [status, setStatus] = useState<StatusType>("al");
    const [sessions, setSessions] = useState<flight_sessions[]>(() => {
        if (currentUser?.role === userRole.STUDENT || currentUser?.role === userRole.PILOT || currentUser?.role === userRole.USER) {
            return sessionsProp.filter(session => session.studentID === currentUser?.id);
        }
        else if (currentUser?.role === userRole.INSTRUCTOR) {
            return sessionsProp.filter(session => session.pilotID === currentUser?.id);
        }
        else {
            return sessionsProp;
        }
    });;
    const [filteredSessions, setFilteredSessions] = useState(sessions)
    const planes = planesProp.filter((p) => currentUser?.classes.includes(p.classes))


    useEffect(() => {
        const filtered = sessions.filter(session => {
            let isValid = true;

            if (status === "available") {
                isValid = isValid && session.studentID === null;
            }

            if (status === "unavailable") {
                isValid = isValid && session.studentID !== null;
            }

            if (selectedPlane && selectedPlane !== "al") {
                isValid = isValid && session.planeID.includes(selectedPlane);
            }
            if (selectedInstructor && selectedInstructor !== "al") {
                isValid = isValid && session.pilotID === selectedInstructor;
            }
            if (selectedStudents && selectedStudents !== "al") {
                isValid = isValid && session.studentID === selectedStudents;
            }

            if (filterDate) {
                const comparisonDate = new Date(filterDate.year, filterDate.month - 1, filterDate.day);
                isValid = isValid && isSameDay(session.sessionDateStart, comparisonDate);
            }


            return isValid;
        });

        setFilteredSessions(filtered); // Update the filtered sessions
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, filterDate, sessions, selectedPlane, selectedInstructor, selectedStudents]); // Recalculate filters when any filter changes



    return (
        <div className='h-full p-6 bg-gray-200'>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Mes vols</p>
                <p className='text-[#797979] text-3xl'>{currentUser?.role !== userRole.USER && filteredSessions.length}</p>
            </div>
            <div className='my-3 flex justify-between'>
                <div className='flex space-x-3'>

                    {sessionChecked.length > 0 && (currentUser?.role == userRole.ADMIN || currentUser?.role == userRole.INSTRUCTOR || currentUser?.role == userRole.OWNER) ?
                        (
                            <DeleteFlightSession description={`Ce vol sera supprimé définitivement`} sessions={sessionChecked} setSessions={setSessions} usersProp={usersProp}>
                                <div className='px-2 py-1 bg-red-600 text-white rounded-lg'>
                                    Supprimer
                                </div>
                            </DeleteFlightSession>
                        ) : null
                    }

                </div>

                <div className='flex w-full justify-end space-x-2'>
                    <>
                        <div className='hidden lg:block h-full'>
                            <NewSession display={'desktop'} setSessions={setSessions} planesProp={planes} />
                        </div>
                        <div className='lg:hidden block h-full'>
                            <NewSession display={'phone'} setSessions={setSessions} planesProp={planes} />
                        </div>
                    </>
                    <Filter
                        status={status}
                        setStatus={setStatus}
                        selectedPlane={selectedPlane}
                        setFilterDate={setFilterDate}
                        setSelectedPlane={setSelectedPlane}
                        usersProp={usersProp}
                        planesProp={planes}
                        selectedInstructor={selectedInstructor}
                        setSelectedInstructor={setSelectedInstructor}
                        selectedStudents={selectedStudents}
                        setSelectedStudents={setSelectedStudents}
                    />
                </div>

            </div>
            {/* Use filtered sessions in the table */}

            <TableComponent
                sessions={filteredSessions} // Pass filtered sessions here
                setSessions={setSessions}
                setSessionChecked={setSessionChecked}
                planesProp={planesProp}
                usersProp={usersProp}
            />

        </div>
    );
};

export default FlightsPageComponent;
