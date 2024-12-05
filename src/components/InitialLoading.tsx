/**
 * @file InitialLoading.tsx
 * @brief A React component that displays a loading spinner while the current user data is being fetched.
 * 
 * This component checks if the current user's data is available. If the data is still loading,
 * it displays a spinner indicating that the data is being fetched. Once the data is available,
 * it renders the child components passed to it.
 * 
 * @param {Object} props - The component properties.
 * @param {string} [props.className] - Optional additional class names for styling.
 * @param {React.ReactNode} props.children - The child components to render after loading.
 * 
 * @returns The rendered loading or children component.
 */

"use client";
import React from 'react';
import { useCurrentUser } from '@/app/context/useCurrentUser';
// import { Spinner } from './ui/SpinnerVariants';

interface props {
    className?: string;
    children: React.ReactNode;
}

const InitialLoading = ({ children, className }: props) => {
    const { currentUser } = useCurrentUser();

    // console.log("InitialLoading | Rendering...");

    if (!currentUser) {
        return (
            <div className={`${className} flex justify-center items-center`}>
                {/* <Spinner>Loading...</Spinner> */}
            </div>
        );
    }
    return (
        <div className={`${className}`}>
            {children}
        </div>
    );
}

export default InitialLoading;
