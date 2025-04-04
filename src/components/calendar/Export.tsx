import React, { useEffect } from 'react'
import { CgExport } from "react-icons/cg";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Spinner } from "../ui/SpinnerVariants";
import { Label } from '../ui/label';
import DatePicker from 'react-datepicker';
import { fr } from 'date-fns/locale';
import { flight_sessions, planes, User, userRole } from '@prisma/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { IoIosWarning } from 'react-icons/io';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MyDocument } from '../pdf/exportCalendar';
import { useCurrentClub } from '@/app/context/useCurrentClub';


interface Props {
    usersProps: User[];
    flightsSessions: flight_sessions[];
    planes: planes[];
}

const Export = ({ usersProps, flightsSessions, planes }: Props) => {
    const { currentClub } = useCurrentClub();
    const [errorMessage, setErrorMessage] = React.useState("")
    const [isOpenPopover, setIsPopoverOpen] = React.useState(false)
    const [isOpenCal1, setIsOpenCal1] = React.useState(false)
    const [isOpenCal2, setIsOpenCal2] = React.useState(false)
    const [startDate, setStartDate] = React.useState(new Date())
    const [endDate, setEndDate] = React.useState(new Date())
    const [instructorsId, setInstructorsId] = React.useState("all")

    useEffect(() => {
        if (startDate >= endDate) {
            setErrorMessage("La date de fin doit être après la date de début")
        }
        else 
        {
            setErrorMessage("")
        }
    }, [startDate, endDate])



    return (
        <Dialog open={isOpenPopover} onOpenChange={setIsPopoverOpen}>
            <DialogTrigger>
                <div
                    className="bg-[#774BBE] flex flex-1 items-center justify-center px-3 py-3 rounded-lg hover:bg-[#6538a5] transition"
                    aria-label="Ouvrir la fenêtre de suppression"
                >
                    <CgExport color="white" size={15} />
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Exporter le calendrier</DialogTitle>
                    <DialogDescription>Choisissez vos options</DialogDescription>
                </DialogHeader>

                {/* Plage de dates */}
                <div className='flex flex-col w-full space-y-2'>
                    <Label>
                        Exportation du
                    </Label>
                    <DatePicker
                        onInputClick={() => setIsOpenCal1(true)}
                        onSelect={() => setIsOpenCal1(false)}
                        open={isOpenCal1}
                        readOnly
                        showIcon
                        selected={startDate}
                        onChange={(date) => {
                            if (!date) setStartDate(new Date())
                            else setStartDate(date)
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select a date"
                        className="w-full p-2 text-base border border-gray-300 rounded-md"
                        todayButton="Aujourd'hui"
                        locale={fr}
                        isClearable
                    />
                    <Label>
                        au
                    </Label>
                    <DatePicker
                        onInputClick={() => setIsOpenCal2(true)}
                        onSelect={() => setIsOpenCal2(false)}
                        open={isOpenCal2}
                        readOnly
                        showIcon
                        selected={endDate}
                        onChange={(date) => {
                            if (!date) setEndDate(new Date())
                            else setEndDate(date)
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select a date"
                        className="w-full p-2 text-base border border-gray-300 rounded-md"
                        todayButton="Aujourd'hui"
                        locale={fr}
                        isClearable
                    />
                </div>

                {/* Instructeur(s) */}
                <div>
                    <Label>
                        Instructeur(s)
                    </Label>
                    <Select
                        value={instructorsId}
                        onValueChange={(val) => setInstructorsId(val)}
                    >
                        <SelectTrigger className="">
                            <SelectValue placeholder="Instructeurs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={"all"}>
                                Tous les instructeurs
                            </SelectItem>
                            {usersProps.map((user) => {
                                if (user.role === userRole.INSTRUCTOR) {
                                    return (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.firstName} {user.lastName}
                                        </SelectItem>
                                    );
                                }
                                return null;
                            })}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    {errorMessage && (
                        <div className="flex items-center text-destructive mb-4">
                            <IoIosWarning className="mr-2" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className='w-full'>
                    <span className='flex flex-row items-center justify-end'>
                        <span>
                            <Button variant="link" aria-label='Annuler' onClick={() => setIsPopoverOpen(false)} className='w-fit text-gray-500'>
                                Annuler
                            </Button>
                        </span>
                        <span>
                            <PDFDownloadLink document={<MyDocument ID={instructorsId} flightsSessions={flightsSessions} startDate={startDate} endDate={endDate} clubHours={currentClub!.HoursOn} planes={planes} />} fileName={`calendrier_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.pdf`}>
                                {({ loading }) => (
                                    <Button variant="perso" disabled={loading} className='w-fit' aria-label='Exporter le calendrier'>
                                        {loading ? (
                                            <Spinner />
                                        ) : "Exporter"}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        </span>
                    </span>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default Export
