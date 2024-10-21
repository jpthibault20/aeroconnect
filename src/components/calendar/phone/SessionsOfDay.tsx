import { FLIGHT_SESSION } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import SessionDisplay from './SessionDisplay'

interface props {
    flightsSessions: FLIGHT_SESSION[]
    selectDate: Date
}

const SessionsOfDay = ({ flightsSessions, selectDate }: props) => {
    const [sessionOfTheDay, setSessionOfTheDay] = useState<FLIGHT_SESSION[]>();

    useEffect(() => {
        try {
            if (flightsSessions) {
                setSessionOfTheDay(filterAndSortFlightSessionsByDate(selectDate, flightsSessions))
            }
            else
                new Error('Aucune session trouvée')
        } catch (error) {
            console.log(error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectDate])

    /**
 * Fonction pour filtrer les sessions de vol selon la date donnée et les trier par ordre chronologique
 * @param targetDate Date cible à comparer (année, mois, jour)
 * @param sessions Tableau de structures FLIGHT_SESSION
 * @returns Un tableau de sessions de vol correspondant à la date donnée, triées par ordre chronologique
 */
    function filterAndSortFlightSessionsByDate(targetDate: Date, sessions: FLIGHT_SESSION[]): FLIGHT_SESSION[] {
        // Filtrer les sessions en fonction de la date cible
        const filteredSessions = sessions.filter(session => {
            const sessionDate = session.sessionDateStart;

            // Comparaison de l'année, du mois et du jour
            return (
                sessionDate.getFullYear() === targetDate.getFullYear() &&
                sessionDate.getMonth() === targetDate.getMonth() &&
                sessionDate.getDate() === targetDate.getDate()
            );
        });

        // Trier les sessions filtrées par l'heure de début (sessionDateStart)
        return filteredSessions.sort((a, b) => a.sessionDateStart.getTime() - b.sessionDateStart.getTime());
    }

    return (
        <div className='h-full w-full'>
            <div className='w-full h-full'>
                <p className='font-istok text-2xl p-3'>
                    {selectDate.toLocaleDateString('fr-FR', { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <div className=' w-full space-y-6 flex flex-col items-center pb-24'>
                    {sessionOfTheDay?.map((session, index) => (
                        <SessionDisplay key={index} session={session} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SessionsOfDay
