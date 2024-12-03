import React, { useState, useEffect, useMemo } from 'react';
import { flight_sessions, planes } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoveLeft, MoveRight } from 'lucide-react';
import { Session } from './Session';
import Filter from '../Filter';
import NewSession from '@/components/NewSession';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
}

const GlobalCalendarPhone = ({ sessions, setSessions, planesProp }: Props) => {
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dates, setDates] = useState<Date[]>([]);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const todayRef = React.useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        const datesArray = getDaysInMonth(today.getFullYear(), today.getMonth());
        setDates(datesArray);
    }, []);

    useEffect(() => {
        const datesArray = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        setDates(datesArray);
    }, [currentDate]);

    // Re-traitement lorsque `sessions` change
    useEffect(() => {
        setSessionsFiltered(sessions); // Réinitialiser les sessions filtrées
    }, [sessions]);

    const getDaysInMonth = (year: number, month: number) => {
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1);
        setCurrentDate(newDate);
        setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatDateAsKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Mois commence à 0
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // Exemple : "2024-12-02"
    };

    const getSessionsGroupedByDate = () => {
        const grouped: Record<string, flight_sessions[]> = {};
        sessionsFlitered
            .sort((a, b) => new Date(a.sessionDateStart).getTime() - new Date(b.sessionDateStart).getTime()) // Tri par date de début
            .forEach((session) => {
                const dateKey = formatDateAsKey(session.sessionDateStart);
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(session);
            });
        return grouped;
    };

    // Mémoriser le regroupement des sessions pour éviter les recalculs inutiles
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const sessionsGroupedByDate = useMemo(() => getSessionsGroupedByDate(), [sessionsFlitered]);

    const getSessionsForDate = (date: Date) => {
        const dateString = formatDateAsKey(date);
        return sessionsGroupedByDate[dateString] || [];
    };

    const getBarColor = (date: Date) => {
        const sessions = getSessionsForDate(date);
        if (sessions.length === 0) return null;
        const hasIncomplete = sessions.some((session) => !session.studentID);
        const allComplete = sessions.every((session) => session.studentID);
        return allComplete ? 'bg-red-500' : hasIncomplete ? 'bg-green-500' : null;
    };

    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    return (
        <div className="relative w-full bg-background mt-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mt-4 px-8">
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeMonth(-1)}
                        className="h-8 w-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => changeMonth(1)}
                        className="h-8 w-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const today = new Date();
                            setCurrentDate(today);
                            setSelectedDate(today);
                            const datesArray = getDaysInMonth(today.getFullYear(), today.getMonth());
                            setDates(datesArray);
                            setTimeout(() => {
                                if (todayRef.current) {
                                    todayRef.current.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'nearest',
                                        inline: 'center',
                                    });
                                }
                            }, 0);
                        }}
                    >
                        Aujourd&apos;hui
                    </Button>
                </div>
            </div>

            <div className="justify-between items-center my-4 flex px-8">
                <Filter sessions={sessions} setSessionsFiltered={setSessionsFiltered} display="phone" />
                <NewSession display={'phone'} setSessions={setSessions} planesProp={planesProp} />
            </div>

            {/* Calendrier */}
            <div className='flex space-x-2 px-1'>
                <div className='flex items-center justify-center'>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                        <MoveLeft />
                    </button>
                </div>
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto scrollbar-hide  pt-2"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {dates.map((date) => {
                        const barColor = getBarColor(date);
                        return (
                            <button
                                key={formatDateAsKey(date)}
                                ref={date.toDateString() === new Date().toDateString() ? todayRef : null}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    'flex min-w-[60px] flex-col items-center rounded-lg px-2 py-3 text-center',
                                    selectedDate.toDateString() === date.toDateString()
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                )}
                                style={{ scrollSnapAlign: 'start' }}
                            >
                                <span className="text-sm font-medium">
                                    {date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                                </span>
                                <span className="text-xl font-bold">{date.getDate()}</span>
                                {barColor && <div className={`h-1 w-5 ${barColor} rounded-full`}></div>}
                            </button>
                        );
                    })}
                </div>
                <div className='flex items-center justify-center'>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                        <MoveRight />
                    </button>
                </div>
            </div>

            {/* Date */}
            <div className="mt-4 text-center text-xl mx-8 border-t pt-6 border-gray-400 ">{formatDate(selectedDate)}</div>

            {/* Sessions */}
            <div className="mt-4 px-8">
                <h3 className="text-lg font-semibold mb-2"></h3>
                {getSessionsForDate(selectedDate).map((session, index) => (
                    <Session key={index} PlaneProps={session.planeID.length} session={session} setSessions={setSessions} />
                ))}
            </div>
        </div>
    );
};

export default GlobalCalendarPhone;
