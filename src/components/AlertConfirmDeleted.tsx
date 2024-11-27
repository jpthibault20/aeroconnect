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

    // Ferme le dialogue automatiquement lorsque loading devient false
    useEffect(() => {
        if (!loading) {
            setIsOpen(false);
        }
    }, [loading]);

    const handleConfirm = () => {
        confirmAction(); // Exécute l'action de confirmation
        // Garde le dialogue ouvert tant que loading est true
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={() => setIsOpen(true)}>
            <AlertDialogTrigger asChild className={style}>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsOpen(false)}>{cancel}</AlertDialogCancel>
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
