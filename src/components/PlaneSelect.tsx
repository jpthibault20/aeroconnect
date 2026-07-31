import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { planes } from '@prisma/client';
import { isPrivatePlane } from '@/lib/planeVisibility';
import PlaneBadge from './PlaneBadge';
import PlaneThumbnail from './plane/PlaneThumbnail';

interface PlaneSelectProps {
    planes: planes[];
    selectedPlane: string;
    onPlaneChange: (plane: string) => void;
}

const PlaneSelect = ({ planes, selectedPlane, onPlaneChange }: PlaneSelectProps) => {
    // Auto-sélection s'il n'y a qu'un seul choix
    useEffect(() => {
        if (planes.length === 1) {
            onPlaneChange(planes[0].id);
        }
    }, [planes, onPlaneChange]);

    return (
        <Select
            value={selectedPlane}
            onValueChange={onPlaneChange}
        >
            <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-700 focus:ring-[#774BBE] focus:ring-offset-0">
                <SelectValue placeholder="Sélectionner un appareil" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="nothing" className="text-slate-400 italic">
                    -- Choisir --
                </SelectItem>

                {planes.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                        <span className="flex items-center gap-2">
                            {/* La séance en salle n'est pas une machine : ni
                                vignette, ni pastille. */}
                            {item.id !== "classroomSession" && (
                                <PlaneThumbnail
                                    imagePath={item.imagePath}
                                    name={item.name}
                                    sizes="32px"
                                    iconClassName="w-3.5 h-3.5"
                                    className="w-8 h-8 rounded-md bg-slate-100 text-slate-400"
                                />
                            )}
                            <span className="truncate">{item.name}</span>
                            {item.id !== "classroomSession" && (
                                <PlaneBadge isPrivate={isPrivatePlane(item)} />
                            )}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default PlaneSelect;