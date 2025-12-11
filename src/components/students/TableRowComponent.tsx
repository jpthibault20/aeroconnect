/**
 * @file TableRowComponent.tsx
 * @brief Renders a single row for a user with modern styling and actions.
 */

import React, { useState } from 'react';
import { TableCell, TableRow } from '../ui/table';
import Restricted from './Restricted';
import { User, userRole } from '@prisma/client';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import { Button } from '../ui/button';
import { deleteUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import UpdateUserComponent from './UpdateUserComponent';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Pencil, Trash2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    user: User;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

// Configuration des couleurs et labels pour les rôles
const roleConfig: Record<string, { label: string; color: string; border: string }> = {
    OWNER: { label: 'Président', color: 'bg-purple-100 text-[#774BBE]', border: 'border-purple-200' },
    ADMIN: { label: 'Admin', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
    MANAGER: { label: 'Manager', color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
    INSTRUCTOR: { label: 'Instructeur', color: 'bg-violet-50 text-violet-700', border: 'border-violet-100' },
    PILOT: { label: 'Pilote', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
    STUDENT: { label: 'Élève', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
    USER: { label: 'Visiteur', color: 'bg-gray-50 text-gray-600', border: 'border-gray-100' },
};

const TableRowComponent = ({ user, setUsers }: Props) => {
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const { currentUser } = useCurrentUser();

    // --- Permissions ---
    const canManage = currentUser?.role === userRole.OWNER ||
        currentUser?.role === userRole.ADMIN ||
        currentUser?.role === userRole.MANAGER;

    // --- Actions ---
    const onClickDeleteUser = async () => {
        if (user.id === currentUser?.id) {
            toast({
                title: "Action impossible",
                description: "Vous ne pouvez pas supprimer votre propre compte.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const res = await deleteUser(user.id);
            if (res.success) {
                setUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
                toast({
                    title: "Utilisateur supprimé",
                    description: "Le membre a été retiré de la base de données.",
                    className: "bg-green-600 text-white border-none"
                });
            } else {
                toast({
                    title: "Erreur",
                    description: res.error || "Impossible de supprimer l'utilisateur.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers ---
    const roleInfo = roleConfig[user.role] || roleConfig.USER;
    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

    return (
        <TableRow className="group hover:bg-slate-50 transition-colors">

            {/* 1. Avatar (Visuel) */}
            <TableCell className="text-center py-3">
                <div className="mx-auto h-9 w-9 rounded-full bg-gradient-to-br from-[#774BBE] to-[#6035a0] flex items-center justify-center text-white text-xs font-bold shadow-sm border-2 border-white ring-1 ring-slate-100">
                    {initials}
                </div>
            </TableCell>

            {/* 2. Identité (Nom + Email) */}
            <TableCell className="pl-4">
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-sm">
                        {user.lastName?.toUpperCase()} {user.firstName}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        {user.email}
                    </span>
                </div>
            </TableCell>

            {/* 3. Rôle (Badge) */}
            <TableCell className="text-center hidden sm:table-cell">
                <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    roleInfo.color,
                    roleInfo.border
                )}>
                    {roleInfo.label}
                </span>
            </TableCell>

            {/* 4. Téléphone (Caché sur mobile) */}
            <TableCell className="text-center hidden md:table-cell">
                {user.phone ? (
                    <div className="flex items-center justify-center gap-1 text-slate-600 text-sm">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {user.phone}
                    </div>
                ) : (
                    <span className="text-slate-300 text-xs">-</span>
                )}
            </TableCell>

            {/* 5. Statut (Restreint) */}
            <TableCell className="text-center">
                <div className="flex justify-center">
                    <Restricted user={user} />
                </div>
            </TableCell>

            {/* 6. Actions (Edit / Delete) */}
            {canManage && (
                <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-100  transition-opacity">

                        {/* Edit Button */}
                        <UpdateUserComponent
                            showPopup={showPopup}
                            setShowPopup={setShowPopup}
                            user={user}
                            setUsers={setUsers}
                        >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-purple-600 hover:bg-purple-50">
                                <Pencil className="w-4 h-4" />
                            </Button>
                        </UpdateUserComponent>

                        {/* Delete Button */}
                        <AlertConfirmDeleted
                            title="Supprimer ce membre ?"
                            description={`Êtes-vous sûr de vouloir supprimer ${user.firstName} ${user.lastName} ? Cette action est définitive.`}
                            cancel="Annuler"
                            confirm="Supprimer"
                            confirmAction={onClickDeleteUser}
                            loading={loading}
                        >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertConfirmDeleted>
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
};

export default TableRowComponent;