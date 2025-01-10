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

interface Props {
    sessionsProp: flight_sessions[];
    planesProp: planes[];
    usersProp: User[]
}

/**
 * @component PlanePageComponent
 * @description Component for managing and displaying flight sessions.
 * 
 * @returns  The rendered component.
 */
const FlightsPageComponent = ({ sessionsProp, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [sessionChecked, setSessionChecked] = useState<flight_sessions[]>([]);
    const [filterAvailable, setFilterAvailable] = useState(false);
    const [filterClassroomSessions, setFilterClassroomSessions] = useState(false);
    const [filterPlanesSessions, setFilterPlanesSessions] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [myFlights, setMyFlights] = useState(false)
    const [sessions, setSessions] = useState<flight_sessions[]>(sessionsProp);
    const [filteredSessions, setFilteredSessions] = useState(sessions); // State for filtered sessions
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
            if (filterClassroomSessions) {
                isValid = isValid && session.planeID.includes("classroomSession");
            }

            if (filterPlanesSessions) {
                isValid = isValid && !session.planeID.includes("classroomSession");
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
    }, [filterAvailable, filterClassroomSessions, filterDate, sessions, myFlights, filterPlanesSessions]); // Recalculate filters when any filter changes

    // const removeFlight = (sessionsParams: string[]) => {
    //     const removeSessions = async () => {
    //         if (sessionsParams.length > 0) {
    //             setLoading(true);
    //             try {
    //                 const res = await removeSessionsByID(sessionsParams);
    //                 if (res.success) {
    //                     toast({
    //                         title: res.success,
    //                         duration: 5000,
    //                         style: {
    //                             background: '#0bab15', //rouge : ab0b0b
    //                             color: '#fff',
    //                         }
    //                     });
    //                     setSessionChecked([]);
    //                     setSessions(sessions.filter(session => !sessionsParams.includes(session.id)));
    //                 }
    //                 if (res.error) {
    //                     toast({
    //                         title: "Oups, une erreur est survenue",
    //                         description: res.error,
    //                         duration: 5000,
    //                         style: {
    //                             background: '#ab0b0b', //rouge : ab0b0b
    //                             color: '#fff',
    //                         }
    //                     });
    //                 }
    //             } catch (error) {
    //                 console.log(error);
    //             } finally {
    //                 setLoading(false);
    //             }
    //         }
    //     };

    //     removeSessions();
    // }

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
                            <DeleteFlightSession description={`Ce vol sera supprimé définitivement`} sessions={sessionChecked} setSessions={setSessions} usersProp={usersProp}>
                                <div className='px-2 py-1 bg-red-600 text-white rounded-lg'>
                                    Supprimer
                                </div>
                            </DeleteFlightSession>
                            // <AlertConfirmDeleted
                            //     title="Etes vous sur de vouloir supprimer ces vols ?"
                            //     description={sessionChecked.length > 1 ? `${sessionChecked.length} vols seront supprimés.` : sessionChecked.length === 1 ? `1 vol sera supprimé.` : `Aucun vol n'a été sélectionné.`}
                            //     cancel='Annuler'
                            //     confirm='Supprimer'
                            //     confirmAction={() => removeFlight(sessionChecked)}
                            //     loading={loading}
                            // >
                            //     <div className='px-2 py-1 bg-red-600 text-white rounded-lg'>
                            //         Supprimer
                            //     </div>
                            // </AlertConfirmDeleted>
                        ) : null
                    }
                    <>
                        <div className='hidden lg:block h-full'>
                            <NewSession display={'desktop'} setSessions={setSessions} planesProp={planesProp} />
                        </div>
                        <div className='lg:hidden block'>
                            <NewSession display={'phone'} setSessions={setSessions} planesProp={planesProp} />
                        </div>
                    </>

                </div>
                <Filter
                    filterAvailable={filterAvailable}
                    filterClassroomSessions={filterClassroomSessions}
                    filterPlanesSessions={filterPlanesSessions}
                    filterDate={filterDate}
                    myFlights={myFlights}
                    setFilterAvailable={setFilterAvailable}
                    setFilterClassroomSessions={setFilterClassroomSessions}
                    setFilterPlanesSessions={setFilterPlanesSessions}
                    setFilterDate={setFilterDate}
                    setMyFlights={setMyFlights}
                />
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
