"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
    HobbsFormat,
    decimalToHoursMinutes,
    parseHobbsInput,
    formatHobbsValue,
} from "@/lib/logbookCalc";

// HH:MM / decimal toggle shared by the flight entry popups. The chosen format
// only affects input: HobbsInput always emits canonical decimal hours.
export function HobbsFormatToggle({
    format,
    onChange,
    disabled,
}: {
    format: HobbsFormat;
    onChange: (format: HobbsFormat) => void;
    disabled?: boolean;
}) {
    const base =
        "px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50";
    return (
        <div className="inline-flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white">
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("HMS")}
                className={`${base} ${format === "HMS" ? "bg-[#774BBE] text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
                HH:MM
            </button>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("DECIMAL")}
                className={`${base} ${format === "DECIMAL" ? "bg-[#774BBE] text-white" : "text-slate-500 hover:bg-slate-50"}`}
            >
                Décimal
            </button>
        </div>
    );
}

// Equality tolerance (~1/2 minute) to avoid overwriting local input when the
// decimal value coming back from the parent is identical.
function sameTime(a: number | null, b: number | null): boolean {
    if (a == null || b == null) return a === b;
    return Math.abs(a - b) < 1 / 120;
}

interface HobbsInputProps {
    // Value in canonical decimal hours (as stored in the DB), or null.
    value: number | null;
    onChange: (decimal: number | null) => void;
    format: HobbsFormat;
    readOnly?: boolean;
    inputClassName?: string;
    placeholder?: string;
}

export function HobbsInput({
    value,
    onChange,
    format,
    readOnly,
    inputClassName,
    placeholder,
}: HobbsInputProps) {
    // Raw local input. Only synced from `value` when it really diverges (prefill /
    // reset) or when the format changes, never on every keystroke, otherwise the
    // cursor jumps and decimals being typed get truncated (e.g. "123." rewritten as
    // "123").
    const [raw, setRaw] = React.useState(() => formatHobbsValue(value, format));
    const prevFormat = React.useRef(format);

    React.useEffect(() => {
        if (prevFormat.current !== format) {
            // Format switch: reformat the current value in the new format so the display
            // stays consistent.
            prevFormat.current = format;
            setRaw(formatHobbsValue(value, format));
            return;
        }
        const local = parseHobbsInput(raw, format).decimal;
        if (!sameTime(local, value)) {
            setRaw(formatHobbsValue(value, format));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, format]);

    const parsed = parseHobbsInput(raw, format);

    const handleChange = (input: string) => {
        setRaw(input);
        onChange(parseHobbsInput(input, format).decimal);
    };

    const readout = (() => {
        if (parsed.minutesInvalid) {
            return <p className="text-xs text-red-600">Minutes invalides (0-59).</p>;
        }
        if (parsed.decimal == null) return null;
        const { hours, minutes } = decimalToHoursMinutes(parsed.decimal);
        return (
            <p className="text-xs text-slate-500">
                = {hours} h {String(minutes).padStart(2, "0")} min
            </p>
        );
    })();

    return (
        <div className="space-y-1">
            <Input
                type="text"
                inputMode="decimal"
                value={raw}
                onChange={(e) => handleChange(e.target.value)}
                readOnly={readOnly}
                placeholder={placeholder ?? (format === "HMS" ? "123:30" : "0.0")}
                className={inputClassName}
                aria-invalid={parsed.minutesInvalid || undefined}
            />
            {!readOnly && readout}
        </div>
    );
}
