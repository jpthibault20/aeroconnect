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
import React, { useEffect, useState } from 'react';
import { User, userRole } from '@prisma/client';
import TableComponent from './TableComponent';
import Header from './Header';
import Filter from './Filter';
import Search from './Search';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        setSortedUsers(sortUser(users, roleFilter, searchQuery));
    }, [users, roleFilter, searchQuery]);

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

    const handleRoleFilterChange = (value: 'all' | userRole) => {
        setRoleFilter(value);
    };

    if (currentUser?.role == userRole.USER || currentUser?.role === userRole.STUDENT || currentUser?.role === userRole.PILOT) {
        router.push('/calendar?clubID=' + currentUser?.clubID);
        return (
            <div>
                No access
            </div>
        )
    }

    return (
        <div className='p-6 bg-gray-200 h-full'>
            <Header users={sortedUsers} />

            <div className='my-3 flex justify-end space-x-3'>
                <Filter roleFilter={roleFilter} handle={handleRoleFilterChange} />
                <Search searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </div>

            <TableComponent users={sortedUsers} setUsers={setUsers} />
        </div>
    );
}

export default StudentsPage;
