"use client"
import React, { useEffect, useState } from 'react'
import { Download, Calendar, User, AlertTriangle, FileDown } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import DatePicker from 'react-datepicker'
import { pdf } from '@react-pdf/renderer';
import { fr } from 'date-fns/locale'
import { flight_sessions, planes, User as UserType, userRole } from '@prisma/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { MyDocument } from '../pdf/exportCalendar'
import { useCurrentClub } from '@/app/context/useCurrentClub'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import 'react-datepicker/dist/react-datepicker.css'

interface Props {
    usersProps: UserType[]
    flightsSessions: flight_sessions[]
    planes: planes[]
}

const Export = ({ usersProps, flightsSessions, planes }: Props) => {
    const { currentClub } = useCurrentClub()
    const { currentUser } = useCurrentUser()
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
            setIsPopoverOpen(false);
        } catch (error) {
            console.error("Erreur lors de la génération du PDF", error);
        }
    };

    if (currentUser?.role !== userRole.ADMIN &&
        currentUser?.role !== userRole.OWNER &&
        currentUser?.role !== userRole.MANAGER
    ) {
        return null;
    }

    return (
        <Dialog open={isOpenPopover} onOpenChange={setIsPopoverOpen}>
            <DialogTrigger asChild>
                {/* Nouveau style "Toolbar Item" : Discret mais clair */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-[#774BBE] hover:bg-purple-50 flex items-center gap-2 h-8 px-3"
                    aria-label="Exporter le calendrier"
                >
                    <FileDown className="w-4 h-4" />
                    <span className="hidden xl:inline text-xs font-medium">Exporter</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-2xl border-none">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <div className="p-2 bg-[#774BBE]/10 rounded-lg">
                            <Download className="w-5 h-5 text-[#774BBE]" />
                        </div>
                        Exporter le calendrier
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Générez un fichier PDF du planning pour vos archives ou l&apos;affichage.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Sélection des dates */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Période</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Du</Label>
                                <div className="relative">
                                    <DatePicker
                                        onInputClick={() => setIsOpenCal1(true)}
                                        onSelect={() => setIsOpenCal1(false)}
                                        open={isOpenCal1}
                                        readOnly
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date || new Date())}
                                        dateFormat="dd/MM/yyyy"
                                        locale={fr}
                                        className="w-full h-9 px-3 py-1 text-sm border border-slate-200 rounded-md bg-slate-50 focus:ring-2 focus:ring-[#774BBE] focus:outline-none cursor-pointer"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Au</Label>
                                <div className="relative">
                                    <DatePicker
                                        onInputClick={() => setIsOpenCal2(true)}
                                        onSelect={() => setIsOpenCal2(false)}
                                        open={isOpenCal2}
                                        readOnly
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date || new Date())}
                                        dateFormat="dd/MM/yyyy"
                                        locale={fr}
                                        className="w-full h-9 px-3 py-1 text-sm border border-slate-200 rounded-md bg-slate-50 focus:ring-2 focus:ring-[#774BBE] focus:outline-none cursor-pointer"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sélection Instructeur */}
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtres</Label>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-600">Instructeur concerné</Label>
                            <Select value={instructorsId} onValueChange={setInstructorsId}>
                                <SelectTrigger className="bg-slate-50 border-slate-200 h-9">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <SelectValue placeholder="Instructeurs" />
                                    </div>
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
                    </div>
                </div>

                {errorMessage && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm mb-4">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <DialogFooter className="border-t border-slate-100 pt-4 flex sm:justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setIsPopoverOpen(false)}
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleDownloadPDF}
                        disabled={!!errorMessage}
                        className="bg-[#774BBE] hover:bg-[#6538a5] text-white gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Télécharger le PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default Export