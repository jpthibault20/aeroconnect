import { getDaysOfWeek, getSessionsFromDate } from '@/api/date';
import { FLIGHT_SESSION } from '@prisma/client';
import React, { useEffect, useState } from 'react'

interface props {
    indexX: number;
    indexY: number;
    tabDays: string[];
    tabHours: number[];
    events: FLIGHT_SESSION | unknown[];
    date: Date;
}



const Session = ({ indexX, indexY, tabHours, events, date }: props) => {
    const [reload, setReload] = useState(false); // Permet de forcer le rechargement de la liste des sessions
    useEffect(() => {
        setReload(prev => !prev);
    }, [events])
    const [availableSessions, setAvailableSessions] = useState<{
        available: number;
        book: number;
        availablePlane: string[];
        avaiblePilot: string[];
    }>({
        available: 0,
        book: 0,
        availablePlane: [],
        avaiblePilot: []
    }); // Permet de stocker les sessions disponibles

    // Création de la date de l'éventuelle session a partir des cooordoné du tableau et de la config de la journée (club)
    const daysOfWeek = getDaysOfWeek(date);
    const sessionDate = new Date(date.getFullYear(), daysOfWeek[indexY].month, daysOfWeek[indexY].dayNumber, Math.floor(tabHours[indexX]), Number((tabHours[indexX] % 1).toFixed(2).substring(2)), 0) // Création de la date de la session
    const session = getSessionsFromDate(sessionDate, events as FLIGHT_SESSION[]) // Récupération des sessions correspondante a la date

    /**
     * 
     * @param type  
     * @param value 
     * 
     * Permet de stocker dans une liste local les sessions du crénau horaire, les disponibilités des avions et pilotes
     */
    const addUniqueValueToSession = (type: 'plane' | 'pilot', value: string) => {
        setAvailableSessions((prevSessions) => {
            // Selon le type, on met à jour soit les avions soit les pilotes
            if (type === 'plane') {
                // Ajout unique dans availablePlane
                if (!prevSessions.availablePlane.includes(value)) {
                    return {
                        ...prevSessions,
                        availablePlane: [...prevSessions.availablePlane, value]
                    };
                }
            } else if (type === 'pilot') {
                // Ajout unique dans avaiblePilot
                if (!prevSessions.avaiblePilot.includes(value)) {
                    return {
                        ...prevSessions,
                        avaiblePilot: [...prevSessions.avaiblePilot, value]
                    };
                }
            }
            // Si la valeur existe déjà, on ne change pas l'état
            return prevSessions;
        });
    };

    /**
     * 
     * @param index 
     * 
     * Permet de récupérer les sessions disponibles pour un index donné de la liste des sessions
     */
    useEffect(() => {
        setAvailableSessions({
            available: 0,
            book: 0,
            availablePlane: [],
            avaiblePilot: []
        })

        for (let i = 0; i < session.length; i++) {
            if (session[i].studentID === null) {

                addUniqueValueToSession('plane', session[i].planeName || "")
                addUniqueValueToSession('pilot', session[i].pilotFirstName)

                setAvailableSessions(prevState => ({
                    ...prevState,
                    available: prevState.available + 1
                }))
            }
            else {
                setAvailableSessions(prevState => ({
                    ...prevState,
                    book: prevState.book + 1
                }))
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload])

    if (session.length === 0) return null; // Si la session n'existe pas, on ne montre rien (on affiche rien dans le calendrier)

    // Calcul de la date de fin de la session
    const endSessionDate = new Date(session[0].sessionDateStart.getFullYear(), session[0].sessionDateStart.getMonth(), session[0].sessionDateStart.getDate(), session[0].sessionDateStart.getHours(), session[0].sessionDateStart.getMinutes() + session[0].sessionDateDuration_min, 0)

    return (
        <div className={`justify-center items-center p-1 rounded-md h-full w-full ${availableSessions.available === 0 ? 'bg-[#CB8A8A] opacity-50' : 'bg-[#B9DFC1]'}`}>
            <div>
                <p className='text-xs text-[#646464] text-end'>
                    {session[0].sessionDateStart.getHours().toString().padStart(2, '0')}:
                    {session[0].sessionDateStart.getMinutes().toString().padStart(2, '0')} -
                    {endSessionDate.getHours().toString().padStart(2, '0')}:
                    {endSessionDate.getMinutes().toString().padStart(2, '0')}
                </p>
            </div>
            {availableSessions.available === 0 ? (
                <div className='text-s font-istok font-semibold'>
                    <p>
                        Complet
                    </p>
                </div>
            ) : (
                <div className='text-xs'>
                    <p className=''>
                        Avion : {availableSessions.availablePlane.length}
                    </p>
                    <p >
                        Pilote : {availableSessions.avaiblePilot.length}
                    </p>

                </div>
            )}
        </div>
    )
}

export default Session
