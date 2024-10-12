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
    });

    const daysOfWeek = getDaysOfWeek(date);
    const sessionDate = new Date(date.getFullYear(), daysOfWeek[indexY].month, daysOfWeek[indexY].dayNumber, Math.floor(tabHours[indexX]), Number((tabHours[indexX] % 1).toFixed(2).substring(2)), 0)
    const sessions = getSessionsFromDate(sessionDate, events as FLIGHT_SESSION[])

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

    useEffect(() => {
        setAvailableSessions({
            available: 0,
            book: 0,
            availablePlane: [],
            avaiblePilot: []
        })

        for (let i = 0; i < sessions.length; i++) {
            if (sessions[i].studentID === null) {

                // addUniqueValueToSession('plane', sessions[i].planeName || "")
                addUniqueValueToSession('pilot', sessions[i].pilotFirstName)

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
    }, [])

    if (sessions.length !== 0) console.log(availableSessions)

    if (sessions.length === 0) return null;

    return (
        <div className={`flex justify-center items-center  rounded-md h-full w-full ${availableSessions.available === 0 ? 'bg-[#CB8A8A] opacity-50' : 'bg-[#B9DFC1]'}`}>
            <div>

            </div>
            {availableSessions.available === 0 ? (
                <div>
                    <p>
                        Complet
                    </p>
                </div>
            ) : (
                <div>
                    <p>
                        Aéronef : {availableSessions.availablePlane.length}
                    </p>
                    <p>
                        Pilote : {availableSessions.avaiblePilot.length}
                    </p>
                </div>
            )}
        </div>
    )
}

export default Session
