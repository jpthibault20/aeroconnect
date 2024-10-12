import React, { Dispatch, SetStateAction } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

interface props {
    className?: string;
    placeholder: string;
    liste: string[];
    onValueChange: Dispatch<SetStateAction<string>>;
}

const CalendarFilter = ({ className, placeholder, liste, onValueChange }: props) => {

    return (
        <div className={`${className}`}>
            <Select onValueChange={onValueChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                
                <SelectContent>
                    <SelectItem value=" ">{placeholder}</SelectItem>
                    {liste.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

        </div>
    )
}

export default CalendarFilter
