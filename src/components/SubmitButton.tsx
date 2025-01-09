import React from 'react';
import { Button } from './ui/button';
import { IoIosWarning } from 'react-icons/io';
import { Spinner } from './ui/SpinnerVariants';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { userRole } from '@prisma/client';

interface SubmitButtonProps {
    submitDisabled: boolean;
    onSubmit: () => void;
    loading: boolean;
    error: string;
    disabledMessage: string;
}

const SubmitButton = ({ submitDisabled, onSubmit, loading, error, disabledMessage }: SubmitButtonProps) => {
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
            <Button className="w-full mt-3" disabled={submitDisabled} onClick={onSubmit}>
                {loading ? <Spinner className='text-white' /> : 'Valider la réservation'}
            </Button>
            {error && <div className="text-red-500 mt-2">{error}</div>}
        </div>
    )
};

export default SubmitButton;
