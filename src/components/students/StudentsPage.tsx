"use client";

import React, { useEffect, useState } from 'react';
import { User, userRole } from '@prisma/client';
import TableComponent from './TableComponent';
import MobileStudentList from './MobileStudentList'; // <-- IMPORT DU NOUVEAU COMPOSANT
import Filter from './Filter';
import Search from './Search';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

interface props {
    userProps: User[]
}

const StudentsPage = ({ userProps }: props) => {
    const { currentUser } = useCurrentUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>(userProps);
    const [sortedUsers, setSortedUsers] = useState<User[]>(userProps);
    const [roleFilter, setRoleFilter] = useState<userRole | 'all'>('all');
    const router = useRouter();

    // --- Logic de tri et filtre ---
    useEffect(() => {
        setSortedUsers(sortUser(users, roleFilter, searchQuery));
    }, [users, roleFilter, searchQuery]);

    const sortUser = (
        users: User[],
        roleFilter: 'all' | userRole,
        searchQuery: string
    ) => {
        let filteredUsers = users;

        if (roleFilter !== 'all') {
            filteredUsers = filteredUsers.filter((user) => user.role === roleFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredUsers = filteredUsers.filter(
                (user) =>
                    user.firstName?.toLowerCase().includes(query) ||
                    user.lastName?.toLowerCase().includes(query)
            );
        }

        return filteredUsers;
    };

    const handleRoleFilterChange = (value: 'all' | userRole) => {
        setRoleFilter(value);
    };

    const membersCount = sortedUsers.filter(u => u.id !== currentUser?.id).length;

    // --- Sécurité ---
    if (currentUser?.role === userRole.USER || currentUser?.role === userRole.STUDENT || currentUser?.role === userRole.PILOT) {
        router.push('/calendar?clubID=' + currentUser?.clubID);
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400">
                Accès non autorisé. Redirection...
            </div>
        );
    }

    return (
        <div className='flex flex-col h-full min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800'>

            {/* Top Bar */}
            <div className='flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4'>
                <div className='flex items-center space-x-3'>
                    <div className="p-2 bg-purple-100 text-[#774BBE] rounded-lg hidden sm:block">
                        <Users className="w-6 h-6" />
                    </div>
                    <h1 className='font-bold text-2xl md:text-3xl text-slate-900 tracking-tight'>Membres</h1>
                    <span className='px-3 py-1 bg-white text-[#774BBE] border border-purple-100 font-semibold rounded-full text-sm shadow-sm'>
                        {membersCount}
                    </span>
                </div>

                <div className='flex flex-col sm:flex-row gap-3 w-full md:w-auto'>
                    <div className="w-full sm:w-auto">
                        <Search searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                    </div>
                    <div className="w-full sm:w-auto">
                        <Filter roleFilter={roleFilter} handle={handleRoleFilterChange} />
                    </div>
                </div>
            </div>

            {/* --- CONTENU --- */}

            {/* 1. VUE DESKTOP (Tableau) : Cachée sur mobile (hidden), visible sur md+ (md:block) */}
            <div className='hidden md:block flex-1 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden'>
                <div className="h-full overflow-auto">
                    <TableComponent users={sortedUsers} setUsers={setUsers} />
                </div>
            </div>

            {/* 2. VUE MOBILE (Cartes) : Visible sur mobile (block), cachée sur md+ (md:hidden) */}
            <div className='block md:hidden pb-10'>
                <MobileStudentList users={sortedUsers} setUsers={setUsers} />
            </div>

        </div>
    );
}

export default StudentsPage;