import React from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import { Spinner } from './ui/SpinnerVariants'

interface Props {
    children: React.ReactNode
    title: string
    description: string
    cancel: string
    confirm: string
    confirmAction: () => void
    loading?: boolean
}

const AlertConfirmDeleted = ({ children, title, description, cancel, confirm, confirmAction, loading }: Props) => {

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{cancel}</AlertDialogCancel>
                    {loading ? (
                        <div className='flex justify-center items-center'>
                            <Spinner />
                        </div>

                    ) : (
                        <AlertDialogAction className='bg-red-700 hover:bg-red-800 text-white' onClick={confirmAction}>
                            {confirm}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default AlertConfirmDeleted
