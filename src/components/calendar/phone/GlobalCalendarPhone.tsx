import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flight_sessions, planes, User } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Session } from './Session';
import Filter from '../Filter';
import NewSession from '@/components/NewSession';
import DeleteManySessions from '@/components/DeleteManySessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProps: User[]
}

// Helper function moved outside to be stable for useMemo
const formatDateAsKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const GlobalCalendarPhone = ({ sessions, setSessions, planesProp, usersProps }: Props) => {
    const { currentUser } = useCurrentUser()
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dates, setDates] = useState<Date[]>([]);

    const itemsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());

    const PRIMARY_COLOR = "bg-[#774BBE]";
    const PRIMARY_BORDER = "border-[#774BBE]";

    useEffect(() => {
        const today = new Date();
        setSelectedDate(today);
    }, []);

    useEffect(() => {
        const datesArray = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        setDates(datesArray);
    }, [currentDate]);

    useEffect(() => {
        if (selectedDate.getMonth() !== currentDate.getMonth() || selectedDate.getFullYear() !== currentDate.getFullYear()) {
            setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
            return;
        }

        const key = formatDateAsKey(selectedDate);
        const element = itemsRef.current.get(key);

        if (element) {
            const timer = setTimeout(() => {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedDate, dates, currentDate]);

    useEffect(() => {
        setSessionsFiltered(sessions);
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
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const dayNumber = date.getDate();
        const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
        const year = date.getFullYear();

        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

        return `${capitalize(dayName)} ${dayNumber} ${capitalize(monthName)} ${year}`;
    };

    // Note: getSessionsGroupedByDate logic is now inlined in useMemo below
    // and formatDateAsKey is defined outside the component.

    const sessionsGroupedByDate = useMemo(() => {
        const grouped: Record<string, flight_sessions[]> = {};
        // Create a copy with [...sessionsFlitered] to avoid mutating state with sort()
        [...sessionsFlitered]
            .sort((a, b) => new Date(a.sessionDateStart).getTime() - new Date(b.sessionDateStart).getTime())
            .forEach((session) => {
                const dateKey = formatDateAsKey(session.sessionDateStart);
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(session);
            });
        return grouped;
    }, [sessionsFlitered]);

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

    const setDateRef = (element: HTMLButtonElement | null, date: Date) => {
        const key = formatDateAsKey(date);
        if (element) {
            itemsRef.current.set(key, element);
        } else {
            itemsRef.current.delete(key);
        }
    };

    return (
        // CONTENEUR PRINCIPAL : Hauteur fixe écran (100dvh) et pas de scroll global
        <div className="flex flex-col w-full h-[100dvh] bg-slate-50 font-sans overflow-hidden">

            {/* --- SECTION FIXE (HEADER + BANDEAU JOURS) --- */}
            <div className="flex-none bg-white z-20 shadow-sm relative">

                {/* 1. HEADER: MOIS & NAVIGATION */}
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        {/* Navigation Mois */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => changeMonth(-1)}
                                className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center capitalize">
                                {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => changeMonth(1)}
                                className="h-8 w-8 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Bouton Aujourd'hui */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const today = new Date();
                                if (today.getMonth() !== currentDate.getMonth() || today.getFullYear() !== currentDate.getFullYear()) {
                                    setCurrentDate(today);
                                }
                                setSelectedDate(today);
                            }}
                            className="h-9 px-3 text-xs border-slate-200 text-slate-600 gap-2 hover:bg-purple-50 hover:text-[#774BBE] hover:border-purple-100"
                        >
                            <CalendarIcon size={14} />
                            Auj.
                        </Button>
                    </div>

                    {/* --- TOOLBAR: ACTIONS --- */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                            <Filter
                                sessions={sessions}
                                setSessionsFiltered={setSessionsFiltered}
                                display='phone'
                                usersProps={usersProps}
                                planesProp={planesProp.filter((p) => currentUser?.classes.includes(p.classes))}
                            />
                        </div>

                        <div className='flex items-center gap-2'>
                            <DeleteManySessions usersProps={usersProps} sessionsProps={sessions} setSessions={setSessions} />
                            <NewSession
                                display='phone'
                                setSessions={setSessions}
                                planesProp={planesProp.filter((p) => currentUser?.classes.includes(p.classes))}
                                usersProps={usersProps}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. CALENDRIER HORIZONTAL (STRIP) */}
                <div className='bg-white border-b border-slate-100 py-3'>
                    <div className="flex items-center">
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                            className="p-2 text-slate-400 hover:text-[#774BBE] transition-colors flex-shrink-0"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex-1 flex overflow-x-auto overflow-y-hidden scrollbar-hide gap-2 px-1 snap-x snap-mandatory">
                            {dates.map((date) => {
                                const isSelected = selectedDate.toDateString() === date.toDateString();
                                const barColor = getBarColor(date);

                                return (
                                    <button
                                        key={formatDateAsKey(date)}
                                        ref={(el) => setDateRef(el, date)}
                                        onClick={() => setSelectedDate(date)}
                                        className={cn(
                                            'snap-start flex flex-col items-center justify-center min-w-14 h-16 my-1 rounded-xl transition-all duration-300 border',
                                            isSelected
                                                ? `${PRIMARY_COLOR} ${PRIMARY_BORDER} text-white shadow-md shadow-purple-200 scale-105 z-10`
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-purple-200'
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[9px] uppercase font-bold tracking-wider mb-0.5 opacity-80",
                                            isSelected ? "text-purple-100" : "text-slate-400"
                                        )}>
                                            {date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}
                                        </span>

                                        <span className={cn(
                                            "text-xl font-bold leading-none mb-1.5",
                                            isSelected ? "text-white" : "text-slate-700"
                                        )}>
                                            {date.getDate()}
                                        </span>

                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full transition-colors",
                                            barColor ? barColor : "bg-transparent",
                                            !barColor && isSelected ? "bg-white/0" : ""
                                        )} />
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-2 text-slate-400 hover:text-[#774BBE] transition-colors flex-shrink-0"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- SECTION DÉFILANTE (LISTE DES SESSIONS) --- */}
            {/* overflow-y-auto ici permet de scroller uniquement cette partie */}
            <div className="flex-1 overflow-y-auto pb-32 bg-slate-50">
                <div className="flex flex-col min-h-full">
                    {/* En-tête de date sélectionnée */}
                    <div className="px-6 py-5 flex items-center gap-4 sticky top-0 bg-slate-50 z-10">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {formatDate(selectedDate)}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Liste */}
                    <div className="px-4 space-y-4 pb-4">
                        {getSessionsForDate(selectedDate).length > 0 ? (
                            getSessionsForDate(selectedDate).map((session, index) => (
                                <div key={index} className="animate-in slide-in-from-bottom-2 duration-500 fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                    <Session
                                        PlaneProps={planesProp}
                                        session={session}
                                        setSessions={setSessions}
                                        userProps={usersProps}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm italic">
                                <span>Aucun vol prévu pour cette date.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalCalendarPhone;