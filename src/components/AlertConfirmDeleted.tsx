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
            setIsOpen(false); // Ferme le dialogue lorsque loading est false
        }
    }, [loading]); // Déclenchement quand loading change

    const handleConfirm = () => {
        confirmAction(); // Exécute l'action de confirmation
    };

    // Ouvre le dialogue lorsqu'on reçoit le trigger pour le faire
    const handleTriggerClick = () => {
        setIsOpen(true); // Ouvre le dialogue
    };

    // Empêche de fermer le dialogue lorsque loading est true
    const handleDialogClose = (open: boolean) => {
        if (!loading) {
            setIsOpen(open); // Si loading est false, on permet de fermer la boîte
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleDialogClose}>
            <AlertDialogTrigger asChild className={style} onClick={handleTriggerClick}>
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
                            <Spinner /> {/* Affiche un spinner pendant le chargement */}
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
