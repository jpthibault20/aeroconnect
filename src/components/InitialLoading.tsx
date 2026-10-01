/**
 * @file InitialLoading.tsx
 * @brief A React component that displays the flight loading animation while the current user data is being fetched.
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
import React, { useEffect } from 'react';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useRouter } from 'next/navigation';
import FlightLoader from './loader/FlightLoader';

interface props {
    className?: string;
    children: React.ReactNode;
    clubIDURL: string;
}

const InitialLoading = ({ children, className, clubIDURL }: props) => {
    const { currentUser } = useCurrentUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);

    useEffect(() => {
        if (!currentUser) return;
        if (
            // Case 1: clubIDURL is set but does not match currentUser?.clubID
            (clubIDURL && currentUser?.clubID !== clubIDURL) ||
            // Case 2: both are set but do not match
            (currentUser?.clubID && clubIDURL && currentUser.clubID !== clubIDURL) ||
            // Case 3: currentUser?.clubID is set but clubIDURL is not
            (currentUser?.clubID && !clubIDURL)
        ) {
            router.replace("/");
        }
        else {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.clubID, clubIDURL, router]);

    if (isLoading) {
        return (
            <FlightLoader variant="page" className={className} />
        );
    }
    return (
        <div className={`${className}`}>
            {children}
        </div>
    );
}

export default InitialLoading;
