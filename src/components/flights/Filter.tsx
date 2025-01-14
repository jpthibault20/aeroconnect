/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @file Filter.tsx
 * @brief A React component for filtering flight sessions.
 * 
 * This component provides options to filter flight sessions based on availability, recurrence, and a specific date.
 * It uses a popover interface to present the filtering options to the user.
 */

import React, { useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import 'react-datepicker/dist/react-datepicker.css';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { planes, User, userRole } from '@prisma/client';
import { fr } from 'date-fns/locale';
import { CiFilter } from "react-icons/ci";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@nextui-org/popover";
import { Button, ButtonGroup } from "@nextui-org/button";
import { Label } from '@radix-ui/react-label';
import { DatePicker } from "@nextui-org/date-picker";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownSection, DropdownItem } from "@nextui-org/dropdown";
import { DateValue } from "@internationalized/date";
import { StatusType } from './FlightsPageComponent';
import { ScrollArea } from "@/components/ui/scroll-area"


interface Props {
    selectedPlane: string;
    setFilterDate: React.Dispatch<React.SetStateAction<DateValue | null>>;
    setSelectedPlane: React.Dispatch<React.SetStateAction<string>>;
    usersProp: User[];
    planesProp: planes[];
    status: StatusType;
    setStatus: React.Dispatch<React.SetStateAction<StatusType>>;
    selectedInstructor: string;
    setSelectedInstructor: React.Dispatch<React.SetStateAction<string>>;
    selectedStudents: string;
    setSelectedStudents: React.Dispatch<React.SetStateAction<string>>;
}

const Filter = ({
    selectedPlane,
    setSelectedPlane,
    setFilterDate,
    usersProp,
    planesProp,
    status,
    setStatus,
    selectedInstructor,
    setSelectedInstructor,
    selectedStudents,
    setSelectedStudents,
}: Props) => {
    const { currentUser } = useCurrentUser();

    return (
        <Popover placement="bottom-end">
            <PopoverTrigger>
                <Button aria-label="Open filters">
                    <CiFilter size={20} />
                    Filter
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit">
                <ScrollArea className="h-[300px] md:h-fit w-fit" >
                    {/* Filter by date */}
                    {currentUser?.role === userRole.ADMIN ||
                        currentUser?.role === userRole.OWNER ||
                        currentUser?.role === userRole.INSTRUCTOR ||
                        currentUser?.role === userRole.STUDENT ||
                        currentUser?.role === userRole.PILOT ? (
                        <div className="flex flex-col border-b px-1 py-4 w-full space-y-2">
                            <Label id="date-label" className="font-semibold">
                                Date
                            </Label>
                            <DatePicker
                                className="max-w-[284px]"
                                aria-labelledby="date-label"
                                aria-label="Select a date"
                                onChange={setFilterDate}
                            />
                            <div className="flex w-full justify-end">
                                <button onClick={() => setFilterDate(null)} className="text-xs">
                                    Toutes les dates
                                </button>
                            </div>
                        </div>
                    ) : null
                    }

                    {/* Filter by status */}
                    {currentUser?.role === userRole.ADMIN ||
                        currentUser?.role === userRole.OWNER ||
                        currentUser?.role === userRole.INSTRUCTOR ? (
                        <div className="flex flex-col border-b px-1 py-2 w-full space-y-2">
                            <Label id="status-label" className="font-semibold">
                                Statut de la session
                            </Label>
                            <Dropdown placement="bottom">
                                <DropdownTrigger>
                                    <Button
                                        variant="light"
                                        className="flex justify-between items-center border border-gray-200 shadow-md"
                                        aria-labelledby="status-label"
                                    >
                                        {status === "al"
                                            ? "Etat de la session"
                                            : status === "available" ? "Disponible" : "Complète"}
                                        <ChevronDown />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Filtrer les sessions par statut"
                                    selectionMode="single"
                                    onAction={(key) => setStatus(key as StatusType)}
                                >
                                    <DropdownItem key="al" textValue="al">Toutes les sessions</DropdownItem>
                                    <DropdownItem key="available" textValue="Disponible">Disponible</DropdownItem>
                                    <DropdownItem key="unavailable" textValue="full">Complète</DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    ) : null
                    }

                    {/* Filter by plane */}
                    {currentUser?.role === userRole.ADMIN ||
                        currentUser?.role === userRole.OWNER ||
                        currentUser?.role === userRole.INSTRUCTOR ||
                        currentUser?.role === userRole.STUDENT ||
                        currentUser?.role === userRole.PILOT ? (
                        <div className="flex flex-col border-b px-1 py-4 w-full space-y-2">
                            <Label id="plane-label" className="font-semibold">
                                Avions
                            </Label>
                            <Dropdown placement="bottom">
                                <DropdownTrigger>
                                    <Button
                                        variant="light"
                                        className="flex justify-between items-center border border-gray-200 shadow-md"
                                        aria-labelledby="plane-label"
                                    >
                                        {selectedPlane === "al" ? "Tous les avions" : selectedPlane === "classroomSession" ? "Théorique" : selectedPlane ? planesProp.find((plane) => plane.id === selectedPlane)?.name : "Appareils"}
                                        <ChevronDown />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Filtrer les sessions par avion"
                                    selectionMode="single"
                                    onAction={(key) => setSelectedPlane(key as string)}
                                >
                                    <>
                                        <DropdownItem key="al" textValue="al">Tous les appareils</DropdownItem>
                                        <DropdownItem key="classroomSession" textValue="classroomSession">Théorique</DropdownItem>
                                        {planesProp.map((plane) => (
                                            <DropdownItem key={plane.id} textValue={plane.name}>{plane.name}</DropdownItem>
                                        ))}
                                    </>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    ) : null
                    }

                    {/* Filter by instructor */}
                    {currentUser?.role === userRole.ADMIN ||
                        currentUser?.role === userRole.OWNER ||
                        currentUser?.role === userRole.STUDENT ||
                        currentUser?.role === userRole.PILOT ? (
                        <div className="flex flex-col px-1 py-4 w-full space-y-2">
                            <Label id="instructor-label" className="font-semibold">
                                Instructeurs
                            </Label>
                            <Dropdown placement="bottom">
                                <DropdownTrigger>
                                    <Button
                                        variant="light"
                                        className="flex justify-between items-center border border-gray-200 shadow-md"
                                        aria-labelledby="instructor-label"
                                    >
                                        {selectedInstructor === "al" ? "Tous les instructeurs" : selectedInstructor ? usersProp.find((user) => user.id === selectedInstructor)?.lastName.toUpperCase().slice(0, 1) + "." + usersProp.find((user) => user.id === selectedInstructor)?.firstName : "Instructeur"}
                                        <ChevronDown />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Filtrer les sessions par instructeur"
                                    selectionMode="single"
                                    onAction={(key) => setSelectedInstructor(key as string)}
                                >
                                    <>
                                        <DropdownItem key="al" textValue="al">Tous les instructeurs</DropdownItem>
                                        {usersProp.map((user) => {
                                            if (user.role === userRole.INSTRUCTOR) {
                                                return (
                                                    <DropdownItem key={user.id} textValue={user.id}>
                                                        {user.lastName.toUpperCase().slice(0, 1)}.{user.firstName}
                                                    </DropdownItem>
                                                );
                                            }
                                        })}
                                    </>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    ) : null
                    }

                    {/* Filter by students */}
                    {currentUser?.role === userRole.ADMIN ||
                        currentUser?.role === userRole.OWNER ||
                        currentUser?.role === userRole.INSTRUCTOR ? (
                        <div className="flex flex-col px-1 py-4 w-full space-y-2">
                            <Label id="instructor-label" className="font-semibold">
                                Elèves
                            </Label>
                            <Dropdown placement="bottom">
                                <DropdownTrigger>
                                    <Button
                                        variant="light"
                                        className="flex justify-between items-center border border-gray-200 shadow-md"
                                        aria-labelledby="instructor-label"
                                    >
                                        {selectedStudents === "al" ? "Tous les élèves" : selectedStudents ? usersProp.find((user) => user.id === selectedStudents)?.lastName.toUpperCase().slice(0, 1) + "." + usersProp.find((user) => user.id === selectedStudents)?.firstName : "Elèves"}
                                        <ChevronDown />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Filtrer les sessions par instructeur"
                                    selectionMode="single"
                                    onAction={(key) => setSelectedStudents(key as string)}
                                >
                                    <>
                                        <DropdownItem key="al" textValue="al">Tous les instructeurs</DropdownItem>
                                        {usersProp.map((user) => {
                                            if (user.role === userRole.STUDENT) {
                                                return (
                                                    <DropdownItem key={user.id} textValue={user.id}>
                                                        {user.lastName.toUpperCase().slice(0, 1)}.{user.firstName}
                                                    </DropdownItem>
                                                );
                                            }
                                        })}
                                    </>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    ) : null
                    }
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

export default Filter;
