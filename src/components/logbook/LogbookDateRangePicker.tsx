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

// Un calendrier à 2 mois dans un popover déborde sur un écran étroit : sous
// le seuil "lg" (même seuil que le reste du carnet de vol pour son bascule-
// ment tableau/cartes), on ouvre plutôt une feuille plein écran depuis le bas.
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

// Sélecteur de plage de dates façon Airbnb : présets rapides (jour, semaine,
// mois, année) + calendrier pour une plage personnalisée. La sélection dans
// le calendrier reste "brouillon" (draft) tant que l'utilisateur n'a pas
// cliqué sur "Appliquer" — un preset, lui, s'applique et referme aussitôt.
// Desktop : popover à 2 mois. Mobile : feuille plein écran à 1 mois, plus
// lisible et fiable au toucher qu'un calendrier compressé dans un popover.
const LogbookDateRangePicker = ({ value, onChange, disabled, className }: Props) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    // Sélection en cours, distincte de la valeur validée (value) tant que
    // l'utilisateur n'a pas cliqué sur "Appliquer".
    const [draft, setDraft] = useState<DateRange | undefined>(value);
    // Mois affiché — contrôlé pour permettre au lien "Aujourd'hui" d'y ramener la vue.
    const [month, setMonth] = useState<Date>(value.from ?? new Date());

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) {
            // Ouverture : repart de la valeur validée (abandonne un éventuel
            // brouillon laissé par une fermeture précédente sans "Appliquer").
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

    // react-day-picker, en mode "range", étend/rétrécit par défaut une plage
    // déjà complète vers le jour cliqué (from conservé, to = jour cliqué) : un
    // seul clic suffirait alors à reformer une plage complète. On veut plutôt
    // qu'un clic sur une plage déjà complète reparte de zéro (from = jour
    // cliqué, to = undefined) et attende un second clic.
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
                "flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#774BBE]/40 disabled:opacity-60 disabled:cursor-not-allowed",
                className
            )}
        >
            <CalendarIcon className="w-4 h-4 text-[#774BBE] flex-shrink-0" />
            <span className="whitespace-nowrap font-medium">{formatLabel(value)}</span>
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
