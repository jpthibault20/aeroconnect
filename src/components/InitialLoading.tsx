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
import React, { useEffect } from 'react';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useRouter } from 'next/navigation';
// import { Spinner } from './ui/SpinnerVariants';

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
            // Cas 1 : Si clubIDURL a une valeur mais qu'elle ne correspond pas à currentUser?.clubID
            (clubIDURL && currentUser?.clubID !== clubIDURL) ||
            // Cas 2 : Si les deux ont une valeur mais qu'elles ne correspondent pas
            (currentUser?.clubID && clubIDURL && currentUser.clubID !== clubIDURL) ||
            // Cas 3 : Si currentUser?.clubID a une valeur mais pas clubIDURL
            (currentUser?.clubID && !clubIDURL)
        ) {
            router.replace("/"); // Redirection
        }
        else {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.clubID, clubIDURL, router]);

    if (isLoading) {
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
