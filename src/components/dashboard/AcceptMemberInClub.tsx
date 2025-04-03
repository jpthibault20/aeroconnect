/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
} from "@nextui-org/react";
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import InputClasses from '../InputClasses';
import { useCurrentClub } from '@/app/context/useCurrentClub';
import { User, userRole } from '@prisma/client';
import { ChevronDown } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { acceptMembershipRequest } from '@/api/db/club';
import { clearCache } from '@/lib/cache';

interface Props {
    membershipRequests: User[];
    setMembershipRequests: React.Dispatch<React.SetStateAction<User[]>>;
    userRequest: User;
}

const AcceptMemberInClub = ({ membershipRequests, setMembershipRequests, userRequest }: Props) => {
    const { currentClub } = useCurrentClub();
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [studentClasses, setStudentClasses] = useState<number[]>(currentClub!.classes);
    const [studentRole, setStudentRole] = useState<userRole>('USER');
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fermer le dropdown si on clique à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRoleToggle = (role: userRole) => {
        setStudentRole(role);
        setIsDropdownOpen(false); // Fermer le dropdown après sélection
    };

    const onClickAccept = (user: User, onClose: () => void) => {
        acceptMembershipRequest(user.id, user.clubIDRequest, studentRole, studentClasses);
        setMembershipRequests(membershipRequests.filter(req => req.id !== user.id));
        onClose();
    };

    return (
        <>
            <Button
                variant="outline"
                className="mr-2 bg-green-100 text-green-600 hover:bg-green-600 hover:text-black"
                onClick={onOpen}
            >
                Accepter
            </Button>
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="overflow-visible">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 text-center">
                                Définissons les paramètres de
                                <br />
                                {userRequest.lastName.toUpperCase() + " " + userRequest.firstName}
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    {/* Dropdown Rôle */}
                                    <div className="relative" ref={dropdownRef}>
                                        <Label className="text-sm font-semibold">Rôle</Label>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="w-full flex justify-between items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none"
                                        >
                                            <span>
                                                {studentRole === userRole.USER && "Visiteur"}
                                                {studentRole === userRole.STUDENT && "Élève"}
                                                {studentRole === userRole.PILOT && "Pilote"}
                                                {studentRole === userRole.INSTRUCTOR && "Instructeur"}
                                                {studentRole === userRole.MANAGER && "Manager"}
                                                {studentRole === userRole.OWNER && "Président"}
                                            </span>
                                            <ChevronDown className="ml-2" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isDropdownOpen && (
                                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                                <ScrollArea className="max-h-48 overflow-y-auto">
                                                    {Object.entries(userRole)
                                                        .filter(([key]) => key !== "ADMIN") // Exclure "ADMIN"
                                                        .map(([key, value]) => (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => handleRoleToggle(value)}
                                                                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${studentRole === value ? 'bg-gray-100 font-semibold' : ''
                                                                    }`}
                                                            >
                                                                {value === "USER" && "Visiteur"}
                                                                {value === "STUDENT" && "Élève"}
                                                                {value === "PILOT" && "Pilote"}
                                                                {value === "INSTRUCTOR" && "Instructeur"}
                                                                {value === "MANAGER" && "Manager"}
                                                                {value === "OWNER" && "Président"}
                                                            </button>
                                                        ))}
                                                </ScrollArea>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input pour les Classes */}
                                    <div>
                                        <InputClasses
                                            disabled={loading}
                                            classes={studentClasses}
                                            setClasses={setStudentClasses}
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button
                                    variant="link"
                                    onClick={onClose}
                                    className="mr-2"
                                    disabled={loading}
                                >
                                    Fermer
                                </Button>
                                <Button
                                    variant="perso"
                                    onClick={() => onClickAccept(userRequest, onClose)}
                                    disabled={loading}
                                >
                                    Accepter
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};

export default AcceptMemberInClub;
