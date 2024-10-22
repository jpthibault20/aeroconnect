import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LuSettings2 } from "react-icons/lu";
import DatePicker from 'react-datepicker'; // Import du sélecteur de date
import 'react-datepicker/dist/react-datepicker.css'; // Import du CSS du sélecteur

interface props {
    filterAvailable: boolean;
    filterReccurence: boolean;
    setFilterAvailable: React.Dispatch<React.SetStateAction<boolean>>;
    setFilterReccurence: React.Dispatch<React.SetStateAction<boolean>>;
    setFilterDate: React.Dispatch<React.SetStateAction<Date | null>>;
}

const Filter = ({ filterAvailable, filterReccurence, setFilterAvailable, setFilterReccurence, setFilterDate }: props) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null); // Garde une copie locale de la date sélectionnée

    const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);
        setFilterDate(date); // Met à jour l'état de la date dans le composant parent
    };

    return (
        <Popover>
            <PopoverTrigger className='bg-[#774BBE] rounded-full flex items-center justify-center p-2'>
                <LuSettings2 size={20} color='white' />
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="flex space-x-2 justify-start items-center border-b border-gray-300 py-2">
                    <Checkbox checked={filterAvailable} onCheckedChange={(checked) => setFilterAvailable(!!checked)} />
                    <button onClick={() => setFilterAvailable(!filterAvailable)} className='flex items-center justify-center'>
                        Filtrer les vols disponibles
                    </button>
                </div>
                <div className="flex space-x-2 justify-statr items-center border-b border-gray-300 py-2">
                    <Checkbox checked={filterReccurence} onCheckedChange={(checked) => setFilterReccurence(!!checked)} />
                    <button onClick={() => setFilterReccurence(!filterReccurence)} className='flex items-center justify-center'>
                        Filtrer les vols récurrents
                    </button>
                </div>
                <div className='flex space-x-2 py-2 items-center'>
                    {/* Sélecteur de date avec popover */}
                    <DatePicker
                        selected={selectedDate}
                        onChange={handleDateChange}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Sélectionnez une date"
                        className="w-full p-2 text-base border border-gray-300 rounded-md"
                        todayButton="Aujourd'hui"
                        isClearable
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default Filter;
