import React, { Dispatch, SetStateAction } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

interface props {
    className?: string;
    placeholder: string;
    liste: string[];
    onValueChange: Dispatch<SetStateAction<string>>;
    value?: string
}

const CalendarFilter = ({ className, placeholder, liste, onValueChange, value }: props) => {

    return (
        <div className={`${className}`}>
            <Select onValueChange={onValueChange} defaultValue={value}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value=" " >{placeholder}</SelectItem> {/* " " permet de supprimer le filtre */}
                    {liste.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

        </div>
    )
}

export default CalendarFilter
