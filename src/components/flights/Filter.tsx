/**
 * @file Filter.tsx
 * @brief A React component for filtering flight sessions.
 * 
 * This component provides options to filter flight sessions based on availability, recurrence, and a specific date.
 * It uses a popover interface to present the filtering options to the user.
 * 
 * @param {Object} props - Component props.
 * @param {boolean} props.filterAvailable - Indicates if the filter for available flights is active.
 * @param {boolean} props.filterReccurence - Indicates if the filter for recurring flights is active.
 * @param {Date | null} props.filterDate - The selected date for filtering.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setFilterAvailable - Function to set the availability filter state.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setFilterReccurence - Function to set the recurrence filter state.
 * @param {React.Dispatch<React.SetStateAction<Date | null>>} props.setFilterDate - Function to set the selected date for filtering.
 * 
 * @returns {JSX.Element} The rendered filter component.
 */

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LuSettings2 } from "react-icons/lu";
import DatePicker from 'react-datepicker'; // Import the date picker component
import 'react-datepicker/dist/react-datepicker.css'; // Import CSS for the date picker
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';

interface props {
    filterAvailable: boolean; ///< Indicates if the filter for available flights is active
    filterReccurence: boolean; ///< Indicates if the filter for recurring flights is active
    filterDate: Date | null; ///< The selected date for filtering
    myFlights: boolean;
    setFilterAvailable: React.Dispatch<React.SetStateAction<boolean>>; ///< Function to update availability filter state
    setFilterReccurence: React.Dispatch<React.SetStateAction<boolean>>; ///< Function to update recurrence filter state
    setFilterDate: React.Dispatch<React.SetStateAction<Date | null>>; ///< Function to update selected date for filtering
    setMyFlights: React.Dispatch<React.SetStateAction<boolean>>;
}

const Filter = ({ filterAvailable, filterReccurence, filterDate, myFlights, setFilterAvailable, setFilterReccurence, setFilterDate, setMyFlights }: props) => {
    const { currentUser } = useCurrentUser();

    /**
     * Handles date changes from the date picker.
     *
     * @param {Date | null} date - The selected date or null.
     */
    const handleDateChange = (date: Date | null) => {
        setFilterDate(date); // Updates the date state in the parent component
    };

    return (
        <Popover>
            <PopoverTrigger className='bg-[#774BBE] rounded-full flex items-center justify-center p-2 hover:bg-[#3d2365]'>
                <LuSettings2 size={20} color='white' />
            </PopoverTrigger>
            <PopoverContent className="w-80">
                {currentUser?.role === userRole.INSTRUCTOR || currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER ? (
                    <div className="flex space-x-2 justify-start items-center border-b border-gray-300 py-2">
                        <Checkbox checked={myFlights} onCheckedChange={(checked) => setMyFlights(!!checked)} />
                        <button onClick={() => setMyFlights(!myFlights)} className='flex items-center justify-center'>
                            Mes vols
                        </button>
                    </div>
                ) : null}
                <div className="flex space-x-2 justify-start items-center border-b border-gray-300 py-2">
                    <Checkbox checked={filterAvailable} onCheckedChange={(checked) => setFilterAvailable(!!checked)} />
                    <button onClick={() => setFilterAvailable(!filterAvailable)} className='flex items-center justify-center'>
                        Vols disponible
                    </button>
                </div>
                <div className="flex space-x-2 justify-statr items-center border-b border-gray-300 py-2">
                    <Checkbox checked={filterReccurence} onCheckedChange={(checked) => setFilterReccurence(!!checked)} />
                    <button onClick={() => setFilterReccurence(!filterReccurence)} className='flex items-center justify-center'>
                        vols récurrents
                    </button>
                </div>
                <div className='flex space-x-2 py-2 items-center'>
                    {/* Date picker for filtering */}
                    <DatePicker
                        showIcon
                        selected={filterDate}
                        onChange={handleDateChange}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Choisir une date"
                        className="w-full p-2 text-base border border-gray-300 rounded-md"
                        todayButton="Today"
                        isClearable
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default Filter;
