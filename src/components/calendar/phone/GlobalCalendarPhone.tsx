/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @file GlobalCalendarPhone.tsx
 * @brief This component renders a calendar view for mobile devices.
 * It allows users to select a date, filter flight sessions by instructor and plane,
 * and view sessions for a specific day. It also includes functionalities for navigating
 * between weeks and creating new flight sessions.
 * 
 * @details
 * - Utilizes React hooks for state management and lifecycle methods.
 * - Integrates components for loading states, day selection, filtering, and session display.
 * - Fetches and filters flight session data based on user input.
 */

import React, { useState } from 'react';
import { flight_sessions, planes } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Session } from './Session';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    loading: boolean;
    planesProp: planes[];
}

/**
 * @component GlobalCalendarPhone
 * @description Main component for displaying a calendar on mobile devices.
 * Handles date selection, session filtering, and session display.
 */
const GlobalCalendarPhone = ({ sessions, loading, setSessions, planesProp }: Props) => {
    // State variables for managing date, instructor, plane, and filtered sessions
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);
    //  <Filter sessions={sessions} setSessionsFiltered={setSessionsFiltered} display='phone' />
    const [currentDate, setCurrentDate] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState(new Date())
    const [dates, setDates] = React.useState<Date[]>([])
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const todayRef = React.useRef<HTMLButtonElement>(null)

    React.useEffect(() => {
        const today = new Date()
        setCurrentDate(today)
        setSelectedDate(today)
        const datesArray = getDaysInMonth(today.getFullYear(), today.getMonth())
        setDates(datesArray)
    }, [])

    React.useEffect(() => {
        const datesArray = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
        setDates(datesArray)
    }, [currentDate])

    const getDaysInMonth = (year: number, month: number) => {
        const date = new Date(year, month, 1)
        const days = []
        while (date.getMonth() === month) {
            days.push(new Date(date))
            date.setDate(date.getDate() + 1)
        }
        return days
    }

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1)
        setCurrentDate(newDate)
        setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1))
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }

    const formatDateAsKey = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0') // Mois commence à 0
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}` // Exemple : "2024-12-02"
    }

    // Nouvelle fonction pour regrouper les sessions par date
    const getSessionsGroupedByDate = () => {
        const grouped: Record<string, flight_sessions[]> = {}
        sessions.forEach(session => {
            const dateKey = formatDateAsKey(session.sessionDateStart)
            if (!grouped[dateKey]) grouped[dateKey] = []
            grouped[dateKey].push(session)
        })
        return grouped
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const sessionsGroupedByDate = React.useMemo(() => getSessionsGroupedByDate(), [])

    const getSessionsForDate = (date: Date) => {
        const dateString = formatDateAsKey(date)
        return sessionsGroupedByDate[dateString] || []
    }

    const getBarColor = (date: Date) => {
        const sessions = getSessionsForDate(date)
        if (sessions.length === 0) return null
        const hasIncomplete = sessions.some(session => !session.studentID)
        const allComplete = sessions.every(session => session.studentID)
        return allComplete ? 'bg-red-500' : hasIncomplete ? 'bg-green-500' : null
    }

    return (
        <div className="relative w-full bg-background px-4">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
                <h2 className="text-lg font-semibold">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const today = new Date()
                            setCurrentDate(today)
                            setSelectedDate(today)
                            const datesArray = getDaysInMonth(today.getFullYear(), today.getMonth())
                            setDates(datesArray)
                            setTimeout(() => {
                                if (todayRef.current) {
                                    todayRef.current.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'nearest',
                                        inline: 'center'
                                    })
                                }
                            }, 0)
                        }}
                    >
                        Aujourd&apos;hui
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeMonth(-1)}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeMonth(1)}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendrier */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-hide px-4 pb-4 pt-2 border-b"
                style={{ scrollSnapType: 'x mandatory' }}
            >
                {dates.map((date) => {
                    const barColor = getBarColor(date)
                    return (
                        <button
                            key={formatDateAsKey(date)}
                            ref={date.toDateString() === new Date().toDateString() ? todayRef : null}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                                "flex min-w-[60px] flex-col items-center rounded-lg px-2 py-3 text-center",
                                selectedDate.toDateString() === date.toDateString()
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                            )}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            <span className="text-sm font-medium">
                                {date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                            </span>
                            <span className="text-xl font-bold">{date.getDate()}</span>
                            {barColor && <div className={`h-1 w-5 ${barColor} rounded-full`}></div>}
                        </button>
                    )
                })}
            </div>

            {/* Date */}
            <div className="mt-4 text-center text-xl">
                {formatDate(selectedDate)}
            </div>

            {/* Sessions */}
            <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2"></h3>
                {getSessionsForDate(selectedDate).map((session, index) => (
                    <Session
                        key={index}
                        PlaneProps={session.planeID.length}
                        session={session}
                    />
                ))}
            </div>
        </div>
    )
}

export default GlobalCalendarPhone;
