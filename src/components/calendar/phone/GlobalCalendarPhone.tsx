import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { flight_sessions, planes, User } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Session } from './Session';
import Filter from '../Filter';
import NewSession from '@/components/NewSession';
import DeleteManySessions from '@/components/DeleteManySessions';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useBaptemePrefetch } from '../BaptemePendingContext';
import { CalendarWalletNotice } from '@/components/wallet/WalletBookingBlock';

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProps: User[]
}

// Number of months shown on each side of the current month: the day strip is a
// continuous, bounded range (all sessions are already in memory, so it is pure
// rendering). Sliding crosses months without a month-end boundary.
const MONTHS_RANGE = 12;

// Helper function moved outside to be stable for useMemo
const formatDateAsKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Strip days are generated at midnight: "today" is normalized the same way so
// the selected date matches a range entry exactly.
const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

interface DayButtonProps {
    date: Date;
    isSelected: boolean;
    barColor: string | null;
    onSelect: (date: Date) => void;
    registerRef: (element: HTMLButtonElement | null, date: Date) => void;
}

// Memoized day button: during a slide only the selection changes, so only the 2
// affected buttons (old / new centered day) actually re-render.
const DayButton = React.memo(function DayButton({ date, isSelected, barColor, onSelect, registerRef }: DayButtonProps) {
    return (
        <button
            ref={(el) => registerRef(el, date)}
            onClick={() => onSelect(date)}
            className={cn(
                'snap-center shrink-0 flex flex-col items-center justify-center min-w-14 h-16 my-1 rounded-xl transition-all duration-300 border',
                isSelected
                    ? 'bg-[#774BBE] border-[#774BBE] text-white shadow-md shadow-purple-200 scale-105 z-10'
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
                barColor ? barColor : "bg-transparent"
            )} />
        </button>
    );
});

const GlobalCalendarPhone = ({ sessions, setSessions, planesProp, usersProps }: Props) => {
    const { currentUser } = useCurrentUser()
    const [sessionsFlitered, setSessionsFiltered] = useState<flight_sessions[]>(sessions);
    const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));

    // --- Strip navigation refs ---
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());
    // Horizontal centers (px, content coordinates) of each day, cached so the scroll
    // sync is pure computation (no reflow per frame).
    const centersRef = useRef<number[]>([]);
    const rafRef = useRef<number | null>(null);
    // True during a code-driven scroll (tap / arrows / "Today"): the "live" selection
    // is ignored until the programmatic animation ends.
    const programmaticRef = useRef(false);
    const programmaticTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Mirror of the selected key, compared in the scroll handler without a stale closure.
    const selectedKeyRef = useRef<string>(formatDateAsKey(selectedDate));
    const didInitRef = useRef(false);
    const initCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Continuous range of days around today (bounded but wide).
    const dates = useMemo<Date[]>(() => {
        const anchor = new Date();
        const start = new Date(anchor.getFullYear(), anchor.getMonth() - MONTHS_RANGE, 1);
        const end = new Date(anchor.getFullYear(), anchor.getMonth() + MONTHS_RANGE + 1, 0);
        const arr: Date[] = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            arr.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return arr;
    }, []);

    useEffect(() => {
        setSessionsFiltered(sessions);
    }, [sessions]);

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

    // Dot color per day, precomputed to avoid rescanning on every slide frame.
    const barColorByKey = useMemo(() => {
        const map: Record<string, string | null> = {};
        for (const key in sessionsGroupedByDate) {
            const daySessions = sessionsGroupedByDate[key];
            const hasIncomplete = daySessions.some((session) => !session.studentID);
            const allComplete = daySessions.every((session) => session.studentID);
            map[key] = allComplete ? 'bg-red-500' : hasIncomplete ? 'bg-green-500' : null;
        }
        return map;
    }, [sessionsGroupedByDate]);

    const getSessionsForDate = (date: Date) => {
        const dateString = formatDateAsKey(date);
        return sessionsGroupedByDate[dateString] || [];
    };

    // Background prefetch of the pending discovery flights of the ONE displayed day:
    // a slot's popup then already has them at hand.
    useBaptemePrefetch(useMemo(
        () => sessionsGroupedByDate[formatDateAsKey(selectedDate)] || [],
        [sessionsGroupedByDate, selectedDate]
    ));

    const formatDate = (date: Date) => {
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const dayNumber = date.getDate();
        const monthName = date.toLocaleDateString('fr-FR', { month: 'long' });
        const year = date.getFullYear();

        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

        return `${capitalize(dayName)} ${dayNumber} ${capitalize(monthName)} ${year}`;
    };

    const registerRef = useCallback((element: HTMLButtonElement | null, date: Date) => {
        const key = formatDateAsKey(date);
        if (element) {
            itemsRef.current.set(key, element);
        } else {
            itemsRef.current.delete(key);
        }
    }, []);

    // Scroll position (absolute, clamped) that puts day `key` at the center of the
    // strip. Returns null while the container or the button cannot be measured.
    const getCenterOffset = useCallback((key: string) => {
        const container = scrollRef.current;
        const el = itemsRef.current.get(key);
        if (!container || !el || container.clientWidth === 0) return null;

        const max = Math.max(0, container.scrollWidth - container.clientWidth);
        const target = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2;
        return Math.min(Math.max(target, 0), max);
    }, []);

    // Centers day `key` in the strip (scroll limited to the horizontal container).
    // Targets an absolute position rather than a delta: a relative scroll computed on
    // a not-yet-settled container sent the strip to one end of the range (~1 year
    // off, with no selected day visible).
    const centerOnKey = useCallback((key: string, smooth: boolean) => {
        const container = scrollRef.current;
        const target = getCenterOffset(key);
        if (!container || target === null) return;

        programmaticRef.current = true;
        if (programmaticTimeout.current) clearTimeout(programmaticTimeout.current);
        programmaticTimeout.current = setTimeout(() => {
            programmaticRef.current = false;
        }, smooth ? 700 : 150);

        if (Math.abs(container.scrollLeft - target) >= 1) {
            container.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
        }
    }, [getCenterOffset]);

    // Selects a day (updates state + optionally recenters the strip).
    const selectDate = useCallback((date: Date, opts?: { scroll?: boolean; smooth?: boolean }) => {
        const key = formatDateAsKey(date);
        if (key !== selectedKeyRef.current) {
            selectedKeyRef.current = key;
            setSelectedDate(date);
        }
        if (opts?.scroll) centerOnKey(key, opts.smooth ?? true);
    }, [centerOnKey]);

    // Stable handler passed to the day buttons: required for React.memo to work
    // (otherwise every slide frame would re-render every day).
    const handleSelect = useCallback((date: Date) => {
        selectDate(date, { scroll: true, smooth: true });
    }, [selectDate]);

    const clampToRange = useCallback((date: Date) => {
        if (dates.length === 0) return date;
        if (date < dates[0]) return dates[0];
        if (date > dates[dates.length - 1]) return dates[dates.length - 1];
        return date;
    }, [dates]);

    // Day arrows (strip sides): ±1 day, then recenter.
    const goToPreviousDay = () => selectDate(clampToRange(addDays(selectedDate, -1)), { scroll: true, smooth: true });
    const goToNextDay = () => selectDate(clampToRange(addDays(selectedDate, 1)), { scroll: true, smooth: true });

    // Month arrows (header): jump to the same day of the target month (clamped to its end).
    const changeMonth = (increment: number) => {
        const target = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + increment, 1);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(selectedDate.getDate(), lastDay));
        selectDate(clampToRange(target), { scroll: true, smooth: true });
    };

    const goToToday = () => selectDate(startOfDay(new Date()), { scroll: true, smooth: true });

    // Recomputes the cached centers (after render / resize).
    const recomputeCenters = useCallback(() => {
        centersRef.current = dates.map((d) => {
            const el = itemsRef.current.get(formatDateAsKey(d));
            return el ? el.offsetLeft + el.offsetWidth / 2 : Number.POSITIVE_INFINITY;
        });
    }, [dates]);

    // "Live" sync: while the user slides, the day whose center is closest to the
    // strip's center becomes the selected day (highlight + month + list follow).
    const handleScroll = useCallback(() => {
        if (programmaticRef.current) return;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const container = scrollRef.current;
            const centers = centersRef.current;
            if (!container || centers.length === 0) return;

            const center = container.scrollLeft + container.clientWidth / 2;

            // Binary search (increasing centers) for the day closest to the center.
            let lo = 0;
            let hi = centers.length - 1;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (centers[mid] < center) lo = mid + 1;
                else hi = mid;
            }
            let idx = lo;
            if (lo > 0 && Math.abs(centers[lo - 1] - center) <= Math.abs(centers[lo] - center)) {
                idx = lo - 1;
            }

            const date = dates[idx];
            if (!date) return;
            const key = formatDateAsKey(date);
            if (key !== selectedKeyRef.current) {
                selectedKeyRef.current = key;
                setSelectedDate(date);
            }
        });
    }, [dates]);

    // On mount: cache the centers + instantly center on today. The strip covers ~2
    // years of days; until the container has its final width (first paint, fonts,
    // parent layout) the centering misses. So retry frame by frame until the target
    // position is reached, then check once more (CSS snap may correct afterwards).
    useLayoutEffect(() => {
        recomputeCenters();
        if (didInitRef.current) return;

        let raf = 0;
        let attempts = 0;

        const settle = () => {
            const container = scrollRef.current;
            const target = getCenterOffset(selectedKeyRef.current);

            if (container && target !== null) {
                recomputeCenters();
                centerOnKey(selectedKeyRef.current, false);

                if (Math.abs(container.scrollLeft - target) <= 2) {
                    didInitRef.current = true;
                    // Safety net: if the layout shifts right after (snap, mobile URL bar), recenter
                    // one last time.
                    initCheckTimeout.current = setTimeout(() => {
                        const finalTarget = getCenterOffset(selectedKeyRef.current);
                        const el = itemsRef.current.get(selectedKeyRef.current);
                        const tolerance = el ? el.offsetWidth / 2 : 2;
                        if (
                            scrollRef.current &&
                            finalTarget !== null &&
                            Math.abs(scrollRef.current.scrollLeft - finalTarget) > tolerance
                        ) {
                            recomputeCenters();
                            centerOnKey(selectedKeyRef.current, false);
                        }
                    }, 250);
                    return;
                }
            }

            if (attempts++ < 30) {
                raf = requestAnimationFrame(settle);
            } else {
                didInitRef.current = true;
            }
        };

        raf = requestAnimationFrame(settle);
        return () => cancelAnimationFrame(raf);
    }, [recomputeCenters, centerOnKey, getCenterOffset]);

    // Resize / rotation: recompute the centers and recenter the selected day.
    useEffect(() => {
        const onResize = () => {
            recomputeCenters();
            centerOnKey(selectedKeyRef.current, false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [recomputeCenters, centerOnKey]);

    useEffect(() => () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        if (programmaticTimeout.current) clearTimeout(programmaticTimeout.current);
        if (initCheckTimeout.current) clearTimeout(initCheckTimeout.current);
    }, []);

    const selectedKey = formatDateAsKey(selectedDate);

    return (
        // MAIN CONTAINER: fixed screen height (100dvh) and no global scroll
        <div className="flex flex-col w-full h-[100dvh] bg-slate-50 font-sans overflow-hidden">

            {/* --- FIXED SECTION (HEADER + DAY STRIP) --- */}
            <div className="flex-none bg-white z-20 shadow-sm relative">

                <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        {/* Month navigation (synced with the centered day) */}
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
                                {selectedDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
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

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                            className="h-9 px-3 text-xs border-slate-200 text-slate-600 gap-2 hover:bg-purple-50 hover:text-[#774BBE] hover:border-purple-100"
                        >
                            <CalendarIcon size={14} />
                            Auj.
                        </Button>
                    </div>

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

                <CalendarWalletNotice className="px-4 py-2 bg-white" />

                {/* 2. HORIZONTAL CALENDAR (STRIP): centered carousel, continuous cross-month slide */}
                <div className='bg-white border-b border-slate-100 py-3'>
                    <div className="flex items-center">
                        <button
                            onClick={goToPreviousDay}
                            className="p-2 text-slate-400 hover:text-[#774BBE] transition-colors flex-shrink-0"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div
                            ref={scrollRef}
                            onScroll={handleScroll}
                            className="relative flex-1 flex overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide gap-2 px-1 snap-x snap-mandatory"
                        >
                            {dates.map((date) => {
                                const key = formatDateAsKey(date);
                                return (
                                    <DayButton
                                        key={key}
                                        date={date}
                                        isSelected={key === selectedKey}
                                        barColor={barColorByKey[key] ?? null}
                                        onSelect={handleSelect}
                                        registerRef={registerRef}
                                    />
                                );
                            })}
                        </div>

                        <button
                            onClick={goToNextDay}
                            className="p-2 text-slate-400 hover:text-[#774BBE] transition-colors flex-shrink-0"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- SCROLLING SECTION (SESSION LIST): only this part scrolls --- */}
            <div className="flex-1 overflow-y-auto pb-32 bg-slate-50">
                <div className="flex flex-col min-h-full">
                    <div className="px-6 py-5 flex items-center gap-4 sticky top-0 bg-slate-50 z-10">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            {formatDate(selectedDate)}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

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
