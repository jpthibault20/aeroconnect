"use client"
import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { FaPen } from 'react-icons/fa'
import { IoMdClose } from 'react-icons/io'
import { UserExemple } from '@/config/exempleData'
import { Input } from '../ui/input'
import { User, userRole } from '@prisma/client'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button'
import { IoChevronDown } from "react-icons/io5";
import Image from 'next/image';
import userPicture from '../../../public/images/userProfil.png'
import Restricted from './Restricted'




const StudentsPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<userRole | 'all'>('all');

    const sortUser = (
        users: User[],
        roleFilter: 'all' | userRole,
        searchQuery: string
    ) => {
        let filteredUsers = users;

        // Filter by rol
        if (roleFilter === 'OWNER') {
            filteredUsers = filteredUsers.filter((user) => user.role === 'OWNER');
        } else if (roleFilter === 'ADMIN') {
            filteredUsers = filteredUsers.filter((user) => user.role === 'ADMIN');
        } else if (roleFilter === 'PILOT') {
            filteredUsers = filteredUsers.filter((user) => user.role === 'PILOT');
        } else if (roleFilter === 'STUDENT') {
            filteredUsers = filteredUsers.filter((user) => user.role === 'STUDENT');
        } else if (roleFilter === 'USER') {
            filteredUsers = filteredUsers.filter((user) => user.role === 'USER');
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

    const onClickDeleteUser = (userId: number) => () => {
        console.log('Delete user : ', userId)
    }

    const onClickUpdateUser = (userId: number) => () => {
        console.log('Update user : ', userId)
    }

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
                            Elève
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
                    placeholder="recherche..."
                    className="p-2 rounded-lg w-full md:w-1/3 mr-10 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Table className='bg-white rounded-lg'>
                <TableHeader>
                    <TableRow>
                        <TableHead className='font-semibold text-lg text-black'>Nom</TableHead>
                        <TableHead className='font-semibold text-lg text-black text-center'>Role</TableHead>
                        <TableHead className='font-semibold text-lg text-black text-center'>Utilisateur restreint</TableHead>
                        <TableHead className='font-semibold text-lg text-black text-center'>Téléphone</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedUsers.map((user, index) => (
                        <TableRow key={index}>
                            <TableCell className='md:flex h-full items-center'>
                                <Image
                                    src={userPicture}
                                    alt='User Image'
                                    height={50}
                                    width={50}
                                    className='rounded-full hidden md:flex justify-center'
                                    priority
                                />
                                <div className='ml-4 h-full w-full flex flex-col justify-center items-start'>
                                    <div className='font-medium text-left'>
                                        {user.lastName.toUpperCase()}{' '}
                                        {user.firstName}
                                    </div>
                                    <div className='text-left text-gray-500'>
                                        {user.email}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className='text-center'>{user.role}</TableCell>
                            <TableCell className='text-center'>
                                <Restricted user={user} />
                            </TableCell>
                            <TableCell className='text-center'>0{user.phone}</TableCell>
                            <TableCell className='flex flex-col items-center space-y-3 justify-center xl:block xl:space-x-5'>
                                <button onClick={onClickUpdateUser(user.id)}>
                                    <FaPen color='blue' size={15} />
                                </button>
                                <button onClick={onClickDeleteUser(user.id)}>
                                    <IoMdClose color='red' size={20} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default StudentsPage
