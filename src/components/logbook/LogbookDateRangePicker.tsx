"use client";

import { useEffect, useRef, useState } from "react";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
    value: DateRange;
    onChange: (range: DateRange) => void;
    disabled?: boolean;
    className?: string;
}

// Laisse le temps de voir la plage complète surlignée avant de refermer.
const CLOSE_DELAY_MS = 500;

const startOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
};
const startOfWeek = (d: Date) => {
    const r = startOfDay(d);
    const mondayOffset = (r.getDay() + 6) % 7; // lundi = 0
    r.setDate(r.getDate() - mondayOffset);
    return r;
};
const endOfWeek = (d: Date) => {
    const r = startOfWeek(d);
    r.setDate(r.getDate() + 6);
    return r;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31);

const PRESETS: { label: string; getRange: () => DateRange }[] = [
    { label: "Ce jour", getRange: () => ({ from: startOfDay(new Date()), to: startOfDay(new Date()) }) },
    { label: "Cette semaine", getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: "Ce mois", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Cette année", getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const formatLabel = (range: DateRange): string => {
    if (!range.from) return "Sélectionner une période";
    if (!range.to) return fmt(range.from);
    return `${fmt(range.from)} → ${fmt(range.to)}`;
};

// Sélecteur de plage de dates : un calendrier unique s'ouvre, on choisit la
// date de début puis la date de fin dedans (les jours entre les deux sont
// surlignés en violet), ou on utilise un preset ("Ce mois", "Cette année"...).
// Se ferme automatiquement une fois la plage (ou le preset) appliqué.
const LogbookDateRangePicker = ({ value, onChange, disabled, className }: Props) => {
    const [open, setOpen] = useState(false);
    // Sélection en cours dans le calendrier, distincte de la valeur validée
    // (value) tant que la plage n'est pas complète (from + to).
    const [draft, setDraft] = useState<DateRange | undefined>(value);
    // Mois affiché (premier des deux panneaux) — contrôlé pour permettre au
    // bouton "Aujourd'hui" d'y ramener la vue.
    const [month, setMonth] = useState<Date>(value.from ?? new Date());

    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    }, []);

    const handleOpenChange = (next: boolean) => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setOpen(next);
        if (next) {
            // Ouverture : se cale sur le mois de la sélection en cours.
            setMonth(value.from ?? new Date());
        } else {
            // Fermeture sans commit (Échap, clic dehors...) : on repart de la
            // valeur validée à la prochaine ouverture plutôt que d'une
            // sélection en cours abandonnée.
            setDraft(value);
        }
    };

    const commitRange = (range: DateRange) => {
        setDraft(range);
        onChange(range);
        // Petit délai avant de refermer, pour laisser voir la plage
        // complète surlignée plutôt que de disparaître instantanément.
        closeTimeoutRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
    };

    // react-day-picker, en mode "range", étend/rétrécit par défaut une plage
    // déjà complète vers le jour cliqué (from conservé, to = jour cliqué) : un
    // seul clic suffirait alors à reformer une plage complète et refermer le
    // popup. On veut plutôt qu'un clic sur une plage déjà complète reparte de
    // zéro (from = jour cliqué, to = undefined) et attende un second clic.
    const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
        const wasComplete = !!draft?.from && !!draft?.to;
        if (wasComplete) {
            setDraft({ from: selectedDay, to: undefined });
            return;
        }
        if (range?.from && range?.to) {
            commitRange(range);
        } else {
            setDraft(range);
        }
    };

    const goToToday = () => setMonth(new Date());

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#774BBE]/40 disabled:opacity-60 disabled:cursor-not-allowed",
                        className
                    )}
                >
                    <CalendarIcon className="w-4 h-4 text-[#774BBE] flex-shrink-0" />
                    <span className="whitespace-nowrap font-medium">{formatLabel(value)}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0 rounded-xl border-slate-200 shadow-lg overflow-hidden">
                <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-2 border-b border-slate-100">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            onClick={() => commitRange(preset.getRange())}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-[#774BBE] transition-colors"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <Calendar
                    mode="range"
                    numberOfMonths={2}
                    month={month}
                    onMonthChange={setMonth}
                    selected={draft}
                    onSelect={handleSelect}
                    locale={fr}
                    classNames={{
                        day_selected:
                            "bg-[#774BBE] text-white hover:bg-[#774BBE] hover:text-white focus:bg-[#774BBE] focus:text-white",
                        day_range_middle: "aria-selected:bg-purple-100 aria-selected:text-[#774BBE]",
                    }}
                />
                <div className="flex items-center justify-center border-t border-slate-100 py-2">
                    <button
                        type="button"
                        onClick={goToToday}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#774BBE] hover:text-[#5f3a99] transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Aujourd&apos;hui
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default LogbookDateRangePicker;
