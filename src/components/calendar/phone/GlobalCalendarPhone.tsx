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

interface Props {
    sessions: flight_sessions[];
    setSessions: React.Dispatch<React.SetStateAction<flight_sessions[]>>;
    planesProp: planes[];
    usersProps: User[]
}

// Nombre de mois affichés de part et d'autre du mois courant : le bandeau de jours
// est une plage continue et bornée (les sessions sont déjà toutes en mémoire, donc
// c'est purement du rendu). Slider traverse les mois sans "borne" de fin de mois.
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

interface DayButtonProps {
    date: Date;
    isSelected: boolean;
    barColor: string | null;
    onSelect: (date: Date) => void;
    registerRef: (element: HTMLButtonElement | null, date: Date) => void;
}

// Bouton de jour mémoïsé : pendant un slide seule la sélection change, donc seuls
// les 2 boutons concernés (ancien / nouveau jour au centre) se re-rendent réellement.
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
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

    // --- Refs de navigation du bandeau ---
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());
    // Centres horizontaux (px, coordonnées de contenu) de chaque jour, mis en cache
    // pour que la synchro au scroll soit du pur calcul (pas de reflow par frame).
    const centersRef = useRef<number[]>([]);
    const rafRef = useRef<number | null>(null);
    // Vrai pendant un défilement déclenché par le code (tap / flèches / "Auj.") :
    // on n'écoute pas la sélection "live" tant que l'animation programmée n'est pas finie.
    const programmaticRef = useRef(false);
    const programmaticTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Miroir de la clé sélectionnée pour comparer dans le handler de scroll sans closure périmée.
    const selectedKeyRef = useRef<string>(formatDateAsKey(selectedDate));
    const didInitRef = useRef(false);

    // Plage continue de jours autour d'aujourd'hui (bornée mais large).
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

    // Couleur de pastille par jour, précalculée pour éviter de rescanner à chaque frame de slide.
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

    // Centre le jour `key` dans le bandeau (scroll limité au conteneur horizontal).
    const centerOnKey = useCallback((key: string, smooth: boolean) => {
        const container = scrollRef.current;
        const el = itemsRef.current.get(key);
        if (!container || !el) return;

        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const delta = (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2);

        programmaticRef.current = true;
        if (programmaticTimeout.current) clearTimeout(programmaticTimeout.current);
        programmaticTimeout.current = setTimeout(() => {
            programmaticRef.current = false;
        }, smooth ? 700 : 150);

        if (Math.abs(delta) >= 1) {
            container.scrollBy({ left: delta, behavior: smooth ? 'smooth' : 'auto' });
        }
    }, []);

    // Sélectionne un jour (met à jour l'état + éventuellement recentre le bandeau).
    const selectDate = useCallback((date: Date, opts?: { scroll?: boolean; smooth?: boolean }) => {
        const key = formatDateAsKey(date);
        if (key !== selectedKeyRef.current) {
            selectedKeyRef.current = key;
            setSelectedDate(date);
        }
        if (opts?.scroll) centerOnKey(key, opts.smooth ?? true);
    }, [centerOnKey]);

    // Handler stable passé aux boutons de jour : indispensable pour que React.memo
    // fasse son travail (sans ça, chaque frame de slide re-rendrait tous les jours).
    const handleSelect = useCallback((date: Date) => {
        selectDate(date, { scroll: true, smooth: true });
    }, [selectDate]);

    const clampToRange = useCallback((date: Date) => {
        if (dates.length === 0) return date;
        if (date < dates[0]) return dates[0];
        if (date > dates[dates.length - 1]) return dates[dates.length - 1];
        return date;
    }, [dates]);

    // Flèches jour (côtés du bandeau) : ±1 jour, puis recentrage.
    const goToPreviousDay = () => selectDate(clampToRange(addDays(selectedDate, -1)), { scroll: true, smooth: true });
    const goToNextDay = () => selectDate(clampToRange(addDays(selectedDate, 1)), { scroll: true, smooth: true });

    // Flèches mois (en-tête) : saute au même quantième dans le mois cible (borné à sa fin de mois).
    const changeMonth = (increment: number) => {
        const target = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + increment, 1);
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        target.setDate(Math.min(selectedDate.getDate(), lastDay));
        selectDate(clampToRange(target), { scroll: true, smooth: true });
    };

    const goToToday = () => selectDate(new Date(), { scroll: true, smooth: true });

    // Recalcule les centres en cache (après rendu / redimensionnement).
    const recomputeCenters = useCallback(() => {
        centersRef.current = dates.map((d) => {
            const el = itemsRef.current.get(formatDateAsKey(d));
            return el ? el.offsetLeft + el.offsetWidth / 2 : Number.POSITIVE_INFINITY;
        });
    }, [dates]);

    // Synchro "live" : pendant que l'utilisateur slide, le jour dont le centre est le plus
    // proche du centre du bandeau devient le jour sélectionné (surlignage + mois + liste suivent).
    const handleScroll = useCallback(() => {
        if (programmaticRef.current) return;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const container = scrollRef.current;
            const centers = centersRef.current;
            if (!container || centers.length === 0) return;

            const center = container.scrollLeft + container.clientWidth / 2;

            // Recherche binaire (centres croissants) du jour le plus proche du centre.
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

    // Au montage : cache des centres + centrage instantané sur aujourd'hui.
    useLayoutEffect(() => {
        recomputeCenters();
        if (!didInitRef.current) {
            didInitRef.current = true;
            // rAF : on centre une fois la largeur du conteneur stabilisée (1er paint).
            requestAnimationFrame(() => centerOnKey(selectedKeyRef.current, false));
        }
    }, [recomputeCenters, centerOnKey]);

    // Redimensionnement / rotation : on recalcule les centres et on recentre le jour sélectionné.
    useEffect(() => {
        const onResize = () => {
            recomputeCenters();
            centerOnKey(selectedKeyRef.current, false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [recomputeCenters, centerOnKey]);

    // Nettoyage.
    useEffect(() => () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        if (programmaticTimeout.current) clearTimeout(programmaticTimeout.current);
    }, []);

    const selectedKey = formatDateAsKey(selectedDate);

    return (
        // CONTENEUR PRINCIPAL : Hauteur fixe écran (100dvh) et pas de scroll global
        <div className="flex flex-col w-full h-[100dvh] bg-slate-50 font-sans overflow-hidden">

            {/* --- SECTION FIXE (HEADER + BANDEAU JOURS) --- */}
            <div className="flex-none bg-white z-20 shadow-sm relative">

                {/* 1. HEADER: MOIS & NAVIGATION */}
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        {/* Navigation Mois (synchronisée avec le jour au centre) */}
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

                        {/* Bouton Aujourd'hui */}
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

                {/* 2. CALENDRIER HORIZONTAL (STRIP) — carrousel centré, slide continu inter-mois */}
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
