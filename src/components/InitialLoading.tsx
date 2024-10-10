"use client"
import React from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Spinner } from './ui/SpinnerVariants';

interface props {
    children: React.ReactNode;
}

const InitialLoading = ({ children }: props) => {
    const { currentUser } = useCurrentUser();

    if (currentUser === undefined) {
        return (
            <div className='h-full flex justify-center items-center '>
                <Spinner>chargement ...</Spinner>
            </div>
        );
    }
    return (
        <div className='h-full'>
            {children}
        </div>
    )
}

export default InitialLoading
