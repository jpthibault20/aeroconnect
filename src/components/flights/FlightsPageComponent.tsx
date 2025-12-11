/**
 * @file PlanePageComponent.tsx
 * @brief Component for displaying flight sessions and filters.
 * * @details
 * Updated design to match Aero Connect modern dashboard style.
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

// Icônes (Optionnel : si tu as lucide-react ou heroicons, c'est mieux d'ajouter des icônes visuelles)

interface Props {
    sessionsProp: flight_sessions[];
    planesProp: planes[];
    usersProp: User[]
}
export type StatusType = "al" | "available" | "unavailable";

const FlightsPageComponent = ({ sessionsProp, planesProp, usersProp }: Props) => {
    const { currentUser } = useCurrentUser();
    const [sessionChecked, setSessionChecked] = useState<flight_sessions[]>([]);
    const [selectedPlane, setSelectedPlane] = useState<string>("al");
    const [filterDate, setFilterDate] = useState<DateValue | null>(null);
    const [selectedInstructor, setSelectedInstructor] = useState<string>("al");
    const [selectedStudents, setSelectedStudents] = useState<string>("al");
    const [status, setStatus] = useState<StatusType>("al");

    // Initialisation du state (inchangé)
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
    });

    const [filteredSessions, setFilteredSessions] = useState(sessions);
    const planes = planesProp.filter((p) => currentUser?.classes.includes(p.classes));

    // Logique de filtrage (inchangé)
    useEffect(() => {
        const filtered = sessions.filter(session => {
            let isValid = true;
            if (status === "available") isValid = isValid && session.studentID === null;
            if (status === "unavailable") isValid = isValid && session.studentID !== null;
            if (selectedPlane && selectedPlane !== "al") isValid = isValid && session.planeID.includes(selectedPlane);
            if (selectedInstructor && selectedInstructor !== "al") isValid = isValid && session.pilotID === selectedInstructor;
            if (selectedStudents && selectedStudents !== "al") isValid = isValid && session.studentID === selectedStudents;
            if (filterDate) {
                const comparisonDate = new Date(filterDate.year, filterDate.month - 1, filterDate.day);
                isValid = isValid && isSameDay(session.sessionDateStart, comparisonDate);
            }
            return isValid;
        });
        setFilteredSessions(filtered);
    }, [status, filterDate, sessions, selectedPlane, selectedInstructor, selectedStudents]);


    // --- RENDU ---

    return (
        // 1. Fond plus léger et moderne (Slate-50 au lieu de Gray-200)
        <div className='h-full min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800'>

            {/* Header Section */}
            <div className='flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4'>
                <div className='flex items-center space-x-3'>
                    <h1 className='font-bold text-3xl text-slate-900 tracking-tight'>Mes vols</h1>

                    {/* Badge compteur stylisé */}
                    {currentUser?.role !== userRole.USER && (
                        <span className='px-3 py-1 bg-white text-purple-600 border border-purple-100 font-semibold rounded-full text-sm shadow-sm'>
                            {filteredSessions.length} vols
                        </span>
                    )}
                </div>

                {/* Action Bar */}
                <div className='flex items-center gap-3'>

                    {/* Zone de suppression conditionnelle (Stylisée en mode "Danger") */}
                    {sessionChecked.length > 0 && (currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.INSTRUCTOR || currentUser?.role === userRole.OWNER || currentUser?.role === userRole.MANAGER) && (
                        <DeleteFlightSession
                            description={`${sessionChecked.length} vols vont être supprimés définitivement`}
                            sessions={sessionChecked}
                            setSessions={setSessions}
                            usersProp={usersProp}
                        >
                            <div className='cursor-pointer px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors font-medium rounded-lg text-sm flex items-center shadow-sm'>
                                <span>Supprimer ({sessionChecked.length})</span>
                            </div>
                        </DeleteFlightSession>
                    )}

                    {/* Groupe Filtre & Ajout */}
                    <div className='flex items-center space-x-2 '>
                        <Filter
                            status={status}
                            setStatus={setStatus}
                            selectedPlane={selectedPlane}
                            setFilterDate={setFilterDate}
                            setSelectedPlane={setSelectedPlane}
                            usersProp={usersProp}
                            planesProp={planesProp}
                            selectedInstructor={selectedInstructor}
                            setSelectedInstructor={setSelectedInstructor}
                            selectedStudents={selectedStudents}
                            setSelectedStudents={setSelectedStudents}
                        />

                        <div className='h-6 w-[1px] bg-slate-200 mx-1'></div> {/* Séparateur vertical visuel */}

                        <div className='hidden lg:block'>
                            <NewSession
                                display={'desktop'}
                                setSessions={setSessions}
                                planesProp={planes}
                                usersProps={usersProp}
                            />
                        </div>
                        <div className='lg:hidden block'>
                            <NewSession
                                display={'phone'}
                                setSessions={setSessions}
                                planesProp={planes}
                                usersProps={usersProp}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            {/* C'est ici que se joue le design "Aero Connect" : une carte blanche, ombrée, qui contient la table */}
            <div className='bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden'>

                {/* Si la table est vide, on peut afficher un état vide (optionnel mais recommandé) */}
                {filteredSessions.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        <p>Aucun vol trouvé pour ces critères.</p>
                    </div>
                ) : (
                    <TableComponent
                        sessions={filteredSessions}
                        setSessions={setSessions}
                        setSessionChecked={setSessionChecked}
                        planesProp={planesProp}
                        usersProp={usersProp}
                    />
                )}
            </div>
        </div>
    );
};

export default FlightsPageComponent;