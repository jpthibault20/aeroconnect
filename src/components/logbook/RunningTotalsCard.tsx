"use client";

import React, { useMemo } from "react";
import { flight_logs } from "@prisma/client";
import { convertMinutesToHours } from "@/api/global function/dateServeur";
import { Clock, Compass, GraduationCap, Timer, PlaneLanding, PlaneTakeoff } from "lucide-react";

interface Props {
    logs: flight_logs[];
}

const RunningTotalsCard = React.memo(({ logs }: Props) => {
    const totals = useMemo(() => {
        let minutes = 0, dc = 0, pic = 0, instr = 0, tk = 0, ld = 0;
        for (let i = 0; i < logs.length; i++) {
            const l = logs[i];
            minutes += l.durationMinutes;
            dc += l.timeDC;
            pic += l.timePIC;
            instr += l.timeInstructor;
            tk += l.takeoffs;
            ld += l.landings;
        }
        return { minutes, dc, pic, instr, tk, ld };
    }, [logs]);

    const stats = [
        { label: "Total heures", value: convertMinutesToHours(totals.minutes), icon: Clock, color: "text-[#774BBE]", bg: "bg-purple-50", border: "border-purple-100" },
        { label: "Heures DC", value: convertMinutesToHours(totals.dc), icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { label: "Heures CdB", value: convertMinutesToHours(totals.pic), icon: Compass, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
        { label: "Heures Instructeur", value: convertMinutesToHours(totals.instr), icon: Timer, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    ];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className={`bg-white border ${stat.border} rounded-xl p-4 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 ${stat.bg} rounded-lg`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <PlaneTakeoff className="w-4 h-4" />
                    <span className="font-medium">{totals.tk}</span>
                    <span className="text-slate-400">dec.</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <PlaneLanding className="w-4 h-4" />
                    <span className="font-medium">{totals.ld}</span>
                    <span className="text-slate-400">att.</span>
                </div>
            </div>
        </div>
    );
});

RunningTotalsCard.displayName = "RunningTotalsCard";
export default RunningTotalsCard;
