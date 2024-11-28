import { useCurrentUser } from '@/app/context/useCurrentUser';
import { User } from '@prisma/client';
import React from 'react'

interface Props {
    users: User[];
}
const Header = ({ users }: Props) => {
    const { currentUser } = useCurrentUser();

    return (
        <div className='flex space-x-3'>
            <p className='font-medium text-3xl'>Les élèves</p>
            <p className='text-[#797979] text-3xl'>{users?.filter(user => user.id !== currentUser?.id).length}</p>
        </div>
    )
}

export default Header
