import React, { useState } from 'react';
import { User, userRole } from '@prisma/client';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { deleteUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import UpdateUserComponent from './UpdateUserComponent';
import AlertConfirmDeleted from '../AlertConfirmDeleted';
import Restricted from './Restricted';
import { Phone, Mail, Pencil, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

// Configuration des couleurs des rôles (Identique au tableau pour la cohérence)
const roleConfig: Record<string, { label: string; color: string; border: string }> = {
    OWNER: { label: 'Président', color: 'bg-purple-100 text-[#774BBE]', border: 'border-purple-200' },
    ADMIN: { label: 'Admin', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
    MANAGER: { label: 'Manager', color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
    INSTRUCTOR: { label: 'Instructeur', color: 'bg-violet-50 text-violet-700', border: 'border-violet-100' },
    PILOT: { label: 'Pilote', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
    STUDENT: { label: 'Élève', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
    USER: { label: 'Visiteur', color: 'bg-gray-50 text-gray-600', border: 'border-gray-100' },
};

const MobileStudentList = ({ users, setUsers }: Props) => {
    const { currentUser } = useCurrentUser();
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    // Filtrage visuel (comme dans le tableau desktop)
    const displayableUsers = users.filter(u => u.id !== currentUser?.id && u.role !== "ADMIN");

    // Gestion de la suppression
    const handleDelete = async (user: User) => {
        setLoadingMap(prev => ({ ...prev, [user.id]: true }));
        try {
            const res = await deleteUser(user.id);
            if (res.success) {
                setUsers(prev => prev.filter(u => u.id !== user.id));
                toast({ title: "Utilisateur supprimé", className: "bg-green-600 text-white" });
            } else {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Erreur technique", variant: "destructive" });
        } finally {
            setLoadingMap(prev => ({ ...prev, [user.id]: false }));
        }
    };

    const managers: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];
    const canManage = currentUser?.role && managers.includes(currentUser.role);

    if (displayableUsers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                <UserIcon className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">Aucun membre trouvé</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-20">
            {displayableUsers.map((user) => {
                const roleInfo = roleConfig[user.role] || roleConfig.USER;
                const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

                // État local pour le popup d'édition de CHAQUE carte
                // Note : Dans une map, il vaut mieux gérer l'état du popup dans un sous-composant, 
                // mais ici on va utiliser le UpdateUserComponent qui gère son trigger.

                return (
                    <Card key={user.id} className="border-slate-200 shadow-sm overflow-hidden">
                        <CardContent className="p-4 space-y-4">

                            {/* Header: Avatar + Nom + Role */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#774BBE] to-[#6035a0] flex items-center justify-center text-white text-sm font-bold shadow-sm border-2 border-white ring-1 ring-slate-100 shrink-0">
                                        {initials}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-tight">
                                            {user.firstName} {user.lastName}
                                        </h3>
                                        <div className={cn("mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border", roleInfo.color, roleInfo.border)}>
                                            {roleInfo.label}
                                        </div>
                                    </div>
                                </div>
                                {/* Switch Restreint */}
                                <div className="shrink-0">
                                    <Restricted user={user} />
                                </div>
                            </div>

                            {/* Infos Contact */}
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span>{user.phone || "Non renseigné"}</span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            {canManage && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    {/* Edit - On utilise un composant wrapper pour gérer l'état du popup individuellement */}
                                    <EditActionWrapper user={user} setUsers={setUsers} />

                                    <AlertConfirmDeleted
                                        title="Supprimer le membre ?"
                                        description="Cette action est irréversible."
                                        cancel="Annuler"
                                        confirm="Supprimer"
                                        confirmAction={() => handleDelete(user)}
                                        loading={loadingMap[user.id]}
                                        style="w-full"
                                    >
                                        <Button variant="outline" className="w-full border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Supprimer
                                        </Button>
                                    </AlertConfirmDeleted>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

// Petit composant wrapper pour gérer l'état 'showPopup' de chaque ligne indépendamment
const EditActionWrapper = ({ user, setUsers }: { user: User, setUsers: React.Dispatch<React.SetStateAction<User[]>> }) => {
    const [showPopup, setShowPopup] = useState(false);
    return (
        <UpdateUserComponent
            showPopup={showPopup}
            setShowPopup={setShowPopup}
            user={user}
            setUsers={setUsers}
        >
            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#774BBE] hover:border-purple-200">
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
            </Button>
        </UpdateUserComponent>
    );
}

export default MobileStudentList;