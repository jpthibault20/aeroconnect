/**
 * @file Filter.tsx
 * @brief Component for filtering flight sessions by instructor and plane.
 * 
 * This component provides a popover interface to select filters for the calendar,
 * allowing users to filter flight sessions by instructor and plane.
 */

import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings2 } from 'lucide-react';
import CalendarFilter from '../CalendarFilter';
import { instructorExemple, planeExemple } from '@/config/exempleData';

interface props {
    setInstructor: React.Dispatch<React.SetStateAction<string>>; ///< Function to update the selected instructor.
    setPlane: React.Dispatch<React.SetStateAction<string>>;      ///< Function to update the selected plane.
    instructor: string;  ///< The currently selected instructor.
    plane: string;       ///< The currently selected plane.
}

/**
 * @function Filter
 * @brief Renders a popover with filters for selecting an instructor and a plane.
 * 
 * The `Filter` component allows users to open a popover to choose an instructor 
 * and a plane from the provided options. These filters are applied to the calendar 
 * to show only relevant flight sessions.
 * 
 * @param {React.Dispatch<React.SetStateAction<string>>} setInstructor - Function to update the instructor filter.
 * @param {React.Dispatch<React.SetStateAction<string>>} setPlane - Function to update the plane filter.
 * @param {string} instructor - The currently selected instructor.
 * @param {string} plane - The currently selected plane.
 * 
 * @returns {JSX.Element} The rendered filter popover.
 */
const Filter = ({ setInstructor, setPlane, instructor, plane }: props) => {
    const planes: string[] = planeExemple.map(plane => plane.name);

    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <div><Settings2 /></div>  {/* Icon trigger for opening the popover */}
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filtres</h4>
                            <p className="text-sm text-muted-foreground">
                                Définissez vos filtres
                            </p>
                        </div>
                        <div className="grid gap-2">
                            {/* Instructor Filter */}
                            <div className="grid grid-cols-2 items-center gap-4">
                                <Label>Instructeur</Label>
                                <CalendarFilter
                                    className='h-full flex items-end justify-end'
                                    placeholder='Instructeur'
                                    liste={instructorExemple}
                                    onValueChange={setInstructor}
                                    value={instructor}
                                />
                            </div>
                            {/* Plane Filter */}
                            <div className="grid grid-cols-2 items-center gap-4">
                                <Label htmlFor="maxWidth">Avion</Label>
                                <CalendarFilter
                                    className='h-full flex items-end justify-end'
                                    placeholder='Avion'
                                    liste={planes}
                                    onValueChange={setPlane}
                                    value={plane}
                                />
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default Filter;
