import React from 'react';
import { Button } from './ui/button';
import { IoIosWarning } from 'react-icons/io';
import { Spinner } from './ui/SpinnerVariants';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';
import { MdModeEdit } from 'react-icons/md';

interface SubmitButtonProps {
    submitDisabled: boolean;
    onSubmit: () => void;
    loading: boolean;
    error: string;
    disabledMessage: string;
    setUpdateSessionsDisabled: React.Dispatch<React.SetStateAction<boolean>>;
    updateSessionsDisabled: boolean;
}

const SubmitButton = ({ submitDisabled, onSubmit, loading, error, disabledMessage, setUpdateSessionsDisabled, updateSessionsDisabled }: SubmitButtonProps) => {
    const { currentUser } = useCurrentUser()

    if (currentUser?.role === userRole.USER) {
        submitDisabled = true;
        disabledMessage = "Vous n'avez pas les droits nécessaires pour cette action."
    }

    return (
        <div className="">
            {submitDisabled && (
                <div className="flex justify-start gap-2 items-center text-red-500">
                    <IoIosWarning size={16} />
                    <span>{disabledMessage}</span>
                </div>
            )}
            <div className='flex flex-row space-x-1 mt-1'>
                {currentUser?.role === userRole.ADMIN || currentUser?.role === userRole.OWNER || currentUser?.role === userRole.INSTRUCTOR ?
                    (
                        <Button
                            // variant="link"
                            onClick={() => setUpdateSessionsDisabled(!updateSessionsDisabled)}
                            className="flex w-fit justify-start items-center bg-blue-700"
                        >
                            <MdModeEdit size={20} />
                        </Button>
                    )
                    : null
                }

                <Button className="w-full" disabled={submitDisabled} onClick={onSubmit}>
                    {loading ? <Spinner className='text-white' /> : 'Valider la réservation'}
                </Button>
            </div>

            {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
    )
};

export default SubmitButton;
