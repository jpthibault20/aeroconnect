import React from 'react'
import { Button } from '../ui/button'
import { IoChevronDown } from 'react-icons/io5'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { userRole } from '@prisma/client';

interface Props {
    roleFilter: userRole | 'all';
    handle: (value: userRole | 'all') => void;
}


const Filter = ({ roleFilter, handle }: Props) => {
    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="px-4 py-2 rounded-md transition-colors text-gray-500" variant="outline">
                        {roleFilter === 'all' && 'Filtre'}
                        {roleFilter === 'OWNER' && 'Président'}
                        {roleFilter === 'ADMIN' && 'Admin'}
                        {roleFilter === 'INSTRUCTOR' && 'Instructeur'}
                        {roleFilter === 'PILOT' && 'Pilote'}
                        {roleFilter === 'STUDENT' && 'Élève'}
                        {roleFilter === 'USER' && 'Visiteur'}
                        <IoChevronDown className='ml-2 text-gray-500' />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'all'}
                        onCheckedChange={() => handle('all')}
                    >
                        Tous
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'OWNER'}
                        onCheckedChange={() => handle('OWNER')}
                    >
                        Président
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'ADMIN'}
                        onCheckedChange={() => handle('ADMIN')}
                    >
                        Admin
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'INSTRUCTOR'}
                        onCheckedChange={() => handle('INSTRUCTOR')}
                    >
                        Instructeur
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'PILOT'}
                        onCheckedChange={() => handle('PILOT')}
                    >
                        Pilote
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'STUDENT'}
                        onCheckedChange={() => handle('STUDENT')}
                    >
                        Élève
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={roleFilter === 'USER'}
                        onCheckedChange={() => handle('USER')}
                    >
                        Visiteur
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

export default Filter
