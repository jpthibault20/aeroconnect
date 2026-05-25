"use client";

import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

interface Props {
    onFilterChange: (filters: { nature?: string }) => void;
}

const NATURE_LABELS: Record<string, string> = {
    CDB: "Commandant de bord",
    INSTRUCTION: "Instruction",
};

const LogbookFilter = ({ onFilterChange }: Props) => {
    return (
        <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select
                defaultValue="ALL"
                onValueChange={(val) =>
                    onFilterChange({ nature: val === "ALL" ? undefined : val })
                }
            >
                <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 text-sm focus:ring-[#774BBE]">
                    <SelectValue placeholder="Nature du vol" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">Tous</SelectItem>
                    {Object.entries(NATURE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default LogbookFilter;
