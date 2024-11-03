import React, { useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog'
import { removeSessionsByID } from '@/api/db/session';
import { Spinner } from '../ui/SpinnerVariants';

interface props {
    sessionChecked: string[];
    reload: boolean;
    setReload: React.Dispatch<React.SetStateAction<boolean>>;
    children: React.ReactNode;
}

export const RemoveConfirm = ({ sessionChecked, reload, setReload, children }: props) => {
    const [loading, setLoading] = useState(false);

    const onClickAction = () => {
        const removeSessions = async () => {
            if (sessionChecked.length > 0) {
                setLoading(true);
                try {
                    await removeSessionsByID(sessionChecked);
                } catch (error) {
                    console.log(error);
                } finally {
                    setLoading(false);
                    setReload(!reload);
                }
            }
        };

        removeSessions();
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Etes vous sur de vouloir supprimer vos vols ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible.
                        <br />
                        {sessionChecked.length > 1 ? `${sessionChecked.length} vols seront supprimés.` : `${sessionChecked.length} vol sera supprimé.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    {loading ? (
                        <div className='flex justify-center items-center'>
                            <Spinner />
                        </div>

                    ) : (
                        <AlertDialogAction className='bg-red-700 hover:bg-red-800 text-white' onClick={onClickAction}>
                            Supprimer
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}       
