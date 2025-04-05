"use client"
import React, { useEffect, useState } from 'react'
import { CgExport } from "react-icons/cg"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import DatePicker from 'react-datepicker'
import { pdf } from '@react-pdf/renderer';
import { fr } from 'date-fns/locale'
import { flight_sessions, planes, User, userRole } from '@prisma/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { IoIosWarning } from 'react-icons/io'
import { MyDocument } from '../pdf/exportCalendar'
import { useCurrentClub } from '@/app/context/useCurrentClub'

interface Props {
    usersProps: User[]
    flightsSessions: flight_sessions[]
    planes: planes[]
}

const Export = ({ usersProps, flightsSessions, planes }: Props) => {
    const { currentClub } = useCurrentClub()
    const [errorMessage, setErrorMessage] = useState("")
    const [isOpenPopover, setIsPopoverOpen] = useState(false)
    const [isOpenCal1, setIsOpenCal1] = useState(false)
    const [isOpenCal2, setIsOpenCal2] = useState(false)
    const [startDate, setStartDate] = useState(new Date())
    const [endDate, setEndDate] = useState(new Date())
    const [instructorsId, setInstructorsId] = useState("all")

    useEffect(() => {
        if (startDate >= endDate) {
            setErrorMessage("La date de fin doit être après la date de début")
        } else {
            setErrorMessage("")
        }
    }, [startDate, endDate])

    const handleDownloadPDF = async () => {
        try {
            const blob = await pdf(
                <MyDocument
                    instructorIDs={[instructorsId]}
                    flightsSessions={flightsSessions}
                    startDate={startDate}
                    endDate={endDate}
                    clubHours={currentClub!.HoursOn}
                    planes={planes}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `calendrier_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erreur lors de la génération du PDF", error);
        }
    };

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

                <div className='flex flex-col w-full space-y-2'>
                    <Label>Exportation du</Label>
                    <DatePicker
                        onInputClick={() => setIsOpenCal1(true)}
                        onSelect={() => setIsOpenCal1(false)}
                        open={isOpenCal1}
                        readOnly
                        showIcon
                        selected={startDate}
                        onChange={(date) => setStartDate(date || new Date())}
                        dateFormat="dd/MM/yyyy"
                        locale={fr}
                        isClearable
                        className="w-full p-2 text-base border border-gray-300 rounded-md"
                    />
                    <Label>au</Label>
                    <DatePicker
                        onInputClick={() => setIsOpenCal2(true)}
                        onSelect={() => setIsOpenCal2(false)}
                        open={isOpenCal2}
                        readOnly
                        showIcon
                        selected={endDate}
                        onChange={(date) => setEndDate(date || new Date())}
                        dateFormat="dd/MM/yyyy"
                        locale={fr}
                        isClearable
                        className="w-full p-2 text-base border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <Label>Instructeur(s)</Label>
                    <Select value={instructorsId} onValueChange={setInstructorsId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Instructeurs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les instructeurs</SelectItem>
                            {usersProps
                                .filter((user) => user.role === userRole.INSTRUCTOR)
                                .map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>

                {errorMessage && (
                    <div className="flex items-center text-destructive mb-4">
                        <IoIosWarning className="mr-2" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <DialogFooter className='w-full'>
                    <span className='flex flex-row items-center justify-end'>
                        <Button variant="link" onClick={() => setIsPopoverOpen(false)} className='text-gray-500'>
                            Annuler
                        </Button>

                        <Button variant="perso" className='w-fit' onClick={handleDownloadPDF} aria-label='Exporter le calendrier'>
                            Exporter
                        </Button>
                    </span>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default Export
