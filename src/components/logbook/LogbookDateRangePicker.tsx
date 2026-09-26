"use client";

import { useEffect, useState } from "react";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    value: DateRange;
    onChange: (range: DateRange) => void;
    disabled?: boolean;
    className?: string;
}

const startOfDay = (d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
};
const startOfWeek = (d: Date) => {
    const r = startOfDay(d);
    const mondayOffset = (r.getDay() + 6) % 7; // Monday = 0
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
// Compact format for small screens: "01/01/26" instead of "01 janv. 2026", so
// the filter box fits next to the other actions.
const fmtShort = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const formatLabel = (range: DateRange, short = false): string => {
    const f = short ? fmtShort : fmt;
    if (!range.from) return short ? "Période" : "Sélectionner une période";
    if (!range.to) return f(range.from);
    return `${f(range.from)} → ${f(range.to)}`;
};

// A 2-month calendar in a popover overflows on a narrow screen: below the "lg"
// breakpoint (same as the rest of the logbook's table/cards switch), open a
// full-screen bottom sheet instead.
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 1023px)");
        const update = () => setIsMobile(mediaQuery.matches);
        update();
        mediaQuery.addEventListener("change", update);
        return () => mediaQuery.removeEventListener("change", update);
    }, []);
    return isMobile;
};

const calendarClassNames = {
    day_selected:
        "bg-[#774BBE] text-white hover:bg-[#774BBE] hover:text-white focus:bg-[#774BBE] focus:text-white",
    day_range_middle: "aria-selected:bg-purple-100 aria-selected:text-[#774BBE]",
};

// Airbnb-style date range picker: quick presets (day, week, month, year) +
// calendar for a custom range. The calendar selection stays a draft until the
// user clicks "Apply"; a preset applies and closes immediately.
// Desktop: 2-month popover. Mobile: full-screen 1-month sheet, more readable and
// reliable to touch than a squeezed calendar in a popover.
const LogbookDateRangePicker = ({ value, onChange, disabled, className }: Props) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    // Selection in progress, separate from the committed value until the user clicks
    // "Apply".
    const [draft, setDraft] = useState<DateRange | undefined>(value);
    // Displayed month, controlled so the "Today" link can bring the view back.
    const [month, setMonth] = useState<Date>(value.from ?? new Date());

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) {
            // On open: restart from the committed value (drops any draft left by a previous
            // close without "Apply").
            setDraft(value);
            setMonth(value.from ?? new Date());
        }
    };

    const applyPreset = (range: DateRange) => {
        onChange(range);
        setOpen(false);
    };

    const applyDraft = () => {
        if (!draft?.from || !draft?.to) return;
        onChange(draft);
        setOpen(false);
    };

    // In "range" mode, react-day-picker extends/shrinks an already complete range to
    // the clicked day by default (from kept, to = clicked day), so a single click
    // would form a complete range again. Instead, a click on a complete range should
    // start over (from = clicked day, to = undefined) and wait for a second click.
    const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
        const wasComplete = !!draft?.from && !!draft?.to;
        if (wasComplete) {
            setDraft({ from: selectedDay, to: undefined });
            return;
        }
        setDraft(range);
    };

    const goToToday = () => setMonth(new Date());
    const canApply = !!draft?.from && !!draft?.to;

    const trigger = (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                "flex items-center gap-1.5 sm:gap-2 h-9 min-w-0 px-2 sm:px-3 rounded-md border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#774BBE]/40 disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        >
            <CalendarIcon className="w-4 h-4 text-[#774BBE] flex-shrink-0" />
            {/* Two labels (rather than a JS computation) to avoid any hydration mismatch. */}
            <span className="truncate font-medium sm:hidden">{formatLabel(value, true)}</span>
            <span className="hidden sm:inline truncate whitespace-nowrap font-medium">{formatLabel(value)}</span>
        </button>
    );

    const presetsRow = (
        <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
                <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.getRange())}
                    className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-[#774BBE] transition-colors"
                >
                    {preset.label}
                </button>
            ))}
        </div>
    );

    const rangeSummary = (
        <div className="grid grid-cols-2 gap-2">
            <div className={cn(
                "rounded-lg border px-3 py-2",
                draft?.from ? "border-[#774BBE]/40 bg-purple-50/50" : "border-slate-200"
            )}>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Du</div>
                <div className="text-sm font-medium text-slate-800">{draft?.from ? fmt(draft.from) : "—"}</div>
            </div>
            <div className={cn(
                "rounded-lg border px-3 py-2",
                draft?.to ? "border-[#774BBE]/40 bg-purple-50/50" : "border-slate-200"
            )}>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Au</div>
                <div className="text-sm font-medium text-slate-800">{draft?.to ? fmt(draft.to) : "—"}</div>
            </div>
        </div>
    );

    const footer = (
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
                type="button"
                onClick={goToToday}
                className="flex items-center gap-1.5 text-xs font-medium text-[#774BBE] hover:text-[#5f3a99] transition-colors"
            >
                <RotateCcw className="w-3 h-3" />
                Aujourd&apos;hui
            </button>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                    Annuler
                </Button>
                <Button
                    size="sm"
                    disabled={!canApply}
                    onClick={applyDraft}
                    className="bg-[#774BBE] hover:bg-[#6538a5] text-white disabled:opacity-50"
                >
                    Appliquer
                </Button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetTrigger asChild>{trigger}</SheetTrigger>
                <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
                    <div className="w-full flex justify-center -mt-2 mb-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    </div>
                    <SheetHeader className="text-left mb-2">
                        <SheetTitle>Période</SheetTitle>
                        <SheetDescription className="sr-only">
                            Choisissez une période prédéfinie ou une plage de dates personnalisée pour filtrer le carnet de vol.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-4">
                        {presetsRow}
                        {rangeSummary}
                        <Calendar
                            mode="range"
                            numberOfMonths={1}
                            month={month}
                            onMonthChange={setMonth}
                            selected={draft}
                            onSelect={handleSelect}
                            locale={fr}
                            className="self-center"
                            classNames={calendarClassNames}
                        />
                        {footer}
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-4 rounded-xl border-slate-200 shadow-lg">
                <div className="flex flex-col gap-4">
                    {presetsRow}
                    {rangeSummary}
                    <Calendar
                        mode="range"
                        numberOfMonths={2}
                        month={month}
                        onMonthChange={setMonth}
                        selected={draft}
                        onSelect={handleSelect}
                        locale={fr}
                        classNames={calendarClassNames}
                    />
                    {footer}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default LogbookDateRangePicker;
