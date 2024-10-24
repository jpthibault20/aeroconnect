/**
 * @file StudentsPage.tsx
 * @brief A React component that displays a list of students with filtering, searching, and action functionalities.
 * 
 * This component allows filtering students by their roles, searching by name, and provides actions
 * to update or delete user entries. The data is displayed in a table format, showing each user's
 * information, including their name, role, restricted status, and phone number.
 * 
 * @returns The rendered StudentsPage component.
 */

"use client";
import React, { useState } from 'react';
import { UserExemple } from '@/config/exempleData';
import { Input } from '../ui/input';
import { User, userRole } from '@prisma/client';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '../ui/button';
import { IoChevronDown } from "react-icons/io5";
import TableComponent from './TableComponent';

const StudentsPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<userRole | 'all'>('all');

    /**
     * @function sortUser
     * @description Filters and sorts the user list based on role and search query.
     * @param {User[]} users - The array of users to be filtered and sorted.
     * @param {userRole | 'all'} roleFilter - The selected role to filter users by.
     * @param {string} searchQuery - The search query to filter users by their names.
     * @returns {User[]} The filtered and sorted array of users.
     */
    const sortUser = (
        users: User[],
        roleFilter: 'all' | userRole,
        searchQuery: string
    ) => {
        let filteredUsers = users;

        // Filter by role
        if (roleFilter !== 'all') {
            filteredUsers = filteredUsers.filter((user) => user.role === roleFilter);
        }

        // Filter by firstname and lastname
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

    const sortedUsers = sortUser(UserExemple, roleFilter, searchQuery);

    const handleRoleFilterChange = (value: 'all' | userRole) => {
        setRoleFilter(value);
    };


    return (
        <div className='p-6 '>
            <div className='flex space-x-3'>
                <p className='font-medium text-3xl'>Les élèves</p>
                <p className='text-[#797979] text-3xl'>{UserExemple.length}</p>
            </div>
            <div className='my-3 flex justify-end space-x-3'>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="px-4 py-2 rounded-md transition-colors text-gray-500" variant="outline">
                            {roleFilter === 'all' && 'Filtre'}
                            {roleFilter === 'OWNER' && 'Gérant'}
                            {roleFilter === 'ADMIN' && 'Admin'}
                            {roleFilter === 'PILOT' && 'Pilote'}
                            {roleFilter === 'STUDENT' && 'Élève'}
                            {roleFilter === 'USER' && 'Utilisateur'}
                            <IoChevronDown className='ml-2 text-gray-500' />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter === 'all'}
                            onCheckedChange={() => handleRoleFilterChange('all')}
                        >
                            Tous
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter === 'OWNER'}
                            onCheckedChange={() => handleRoleFilterChange('OWNER')}
                        >
                            Gérant
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter === 'ADMIN'}
                            onCheckedChange={() => handleRoleFilterChange('ADMIN')}
                        >
                            Admin
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter === 'PILOT'}
                            onCheckedChange={() => handleRoleFilterChange('PILOT')}
                        >
                            Pilote
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter === 'STUDENT'}
                            onCheckedChange={() => handleRoleFilterChange('STUDENT')}
                        >
                            Élève
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                            checked={roleFilter === 'USER'}
                            onCheckedChange={() => handleRoleFilterChange('USER')}
                        >
                            Utilisateur
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Input
                    type="text"
                    placeholder="Recherche..."
                    className="p-2 rounded-lg w-full md:w-1/3 mr-10 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <TableComponent users={sortedUsers} />
        </div>
    );
}

export default StudentsPage;
