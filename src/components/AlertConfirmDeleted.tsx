import React, { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';
import { Spinner } from './ui/SpinnerVariants';

interface Props {
    children: React.ReactNode;
    title: string;
    description: string;
    cancel: string;
    confirm: string;
    confirmAction: () => void;
    loading?: boolean;
    style?: string;
}

const AlertConfirmDeleted = ({ children, title, description, cancel, confirm, confirmAction, loading, style }: Props) => {
    const [isOpen, setIsOpen] = useState(false);

    // Surveille les changements de l'état loading
    useEffect(() => {
        // Si loading passe de true à false, ferme la popup
        if (loading === false) {
            setIsOpen(false);
        }
    }, [loading]);

    const handleConfirm = () => {
        confirmAction(); // Exécute l'action de confirmation
    };

    const handleTriggerClick = () => {
        setIsOpen(true); // Ouvre le dialogue
    };

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogTrigger className={style} onClick={handleTriggerClick}>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={loading}>{cancel}</AlertDialogCancel>
                    {loading ? (
                        <div className="flex justify-center items-center">
                            <Spinner />
                        </div>
                    ) : (
                        <AlertDialogAction
                            className="bg-red-700 hover:bg-red-800 text-white"
                            onClick={handleConfirm}
                        >
                            {confirm}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default AlertConfirmDeleted;