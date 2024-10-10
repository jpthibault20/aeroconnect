"use client"
import React from 'react'
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { Spinner } from './ui/SpinnerVariants';

interface props {
    className?: string;
    children: React.ReactNode;
}

const InitialLoading = ({ children, className }: props) => {
    const { currentUser } = useCurrentUser();

    if (currentUser === undefined) {
        return (
            <div className={`${className} flex justify-center items-center`}  >
                <Spinner>chargement ...</Spinner>
            </div>
        );
    }
    return (
        <div className={`${className}`}>
            {children}
        </div>
    )
}

export default InitialLoading
