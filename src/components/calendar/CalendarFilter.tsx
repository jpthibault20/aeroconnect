/**
 * @file CalendarFilter.js
 * @brief Dropdown filter component for selecting an option from a list.
 * 
 * This component displays a dropdown (using the `Select` component) that allows the user
 * to filter a list by selecting an item. It supports a custom placeholder and the ability
 * to reset the filter with a default "empty" option.
 */

import React, { Dispatch, SetStateAction } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

interface props {
    className?: string;  ///< Optional additional classes for styling the component.
    placeholder: string; ///< Placeholder text displayed when no option is selected.
    liste: string[];     ///< Array of options to be displayed in the dropdown.
    onValueChange: Dispatch<SetStateAction<string>>; ///< Function called when a new value is selected.
    value?: string;      ///< Optional default selected value.
}

/**
 * @function CalendarFilter
 * @brief Renders a dropdown filter component with selectable options.
 * 
 * The `CalendarFilter` component allows users to filter data by selecting an option
 * from a dropdown. It accepts a list of options and calls `onValueChange` when a 
 * new value is selected. An empty string (" ") is included as the first option to 
 * allow the user to remove the filter.
 * 
 * @param {string} className - Additional CSS classes for styling the component.
 * @param {string} placeholder - Text shown when no option is selected.
 * @param {string[]} liste - List of options available for selection.
 * @param {function} onValueChange - Function to handle changes when a new option is selected.
 * @param {string} value - Optional initial selected value.
 * 
 * @returns {JSX.Element} The rendered filter dropdown component.
 */
const CalendarFilter = ({ className, placeholder, liste, onValueChange, value }: props) => {

    return (
        <div className={`${className}`}>
            <Select onValueChange={onValueChange} defaultValue={value}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>

                <SelectContent>
                    {/* The empty option allows the filter to be cleared */}
                    <SelectItem value=" " >{placeholder}</SelectItem>
                    {liste.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

export default CalendarFilter
