"use client";
import React, { useEffect, useState } from 'react';
import TableComponent from "@/components/flights/TableComponent";
import { flightsSessionsExemple } from '@/config/exempleData';
import { Button } from '@/components/ui/button';
import Filter from '@/components/flights/Filter';

const PlanePageComponent = () => {
    const [sessionChecked, setSessionChecked] = useState<number[]>([]);
    const [filterAvailable, setFilterAvailable] = useState(false);
    const [filterReccurence, setFilterReccurence] = useState(false);
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [filteredSessions, setFilteredSessions] = useState(flightsSessionsExemple); // Nouvel état pour les sessions filtrées

    // Logique de filtrage dans le useEffect
    useEffect(() => {

        const filtered = flightsSessionsExemple.filter(session => {
            let isValid = true;

            // Filtrer par disponibilité (par exemple, en fonction d'une propriété comme session.isAvailable)
            if (filterAvailable) {
                isValid = isValid && session.studentID === null;
            }

            // Filtrer par récurrence (par exemple, si la session a une récurrence)
            if (filterReccurence) {
                isValid = isValid && session.finalReccurence !== null;
            }

            // Filtrer par date (si une date de filtre est sélectionnée)
            if (isValidDate(filterDate)) {
                const sessionDate = new Date(session.sessionDateStart);
                isValid = isValid && sessionDate.toDateString() === filterDate!.toDateString();
            }

            return isValid;
        });

        setFilteredSessions(filtered); // Mise à jour des sessions filtrées
    }, [filterAvailable, filterReccurence, filterDate]); // Le filtre est recalculé quand un filtre change

    useEffect(() => {
        console.log(sessionChecked); // Log selected session IDs when changed
    }, [sessionChecked]);

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
        <div>
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
            {/* Utiliser les sessions filtrées dans le tableau */}
            <TableComponent
                sessions={filteredSessions} // Passer les sessions filtrées ici
                setSessionChecked={setSessionChecked}
            />
        </div>
    );
};

export default PlanePageComponent