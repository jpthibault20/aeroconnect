import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings2 } from 'lucide-react'
import CalendarFilter from '../CalendarFilter'
import { instructorExemple, planeExemple } from '@/config/exempleData'


interface props {
    setInstructor: React.Dispatch<React.SetStateAction<string>>;
    setPlane: React.Dispatch<React.SetStateAction<string>>;
    instructor: string
    plane: string
}
const Filter = ({ setInstructor, setPlane, instructor, plane }: props) => {
    return (
        <div>
            <Popover>
                <PopoverTrigger asChild>
                    <div ><Settings2 /></div>
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
                            <div className="grid grid-cols-2 items-center gap-4">
                                <Label htmlFor="maxWidth">Avion</Label>
                                <CalendarFilter
                                    className='h-full flex items-end justify-end'
                                    placeholder='Avion'
                                    liste={planeExemple}
                                    onValueChange={setPlane}
                                    value={plane}
                                />
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default Filter
