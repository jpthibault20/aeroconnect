import React from 'react';
import { Button } from '../ui/button';
import { IoIosWarning } from 'react-icons/io';
import { Spinner } from '../ui/SpinnerVariants';

interface SubmitButtonProps {
    submitDisabled: boolean;
    onSubmit: () => void;
    loading: boolean;
    error: string;
    disabledMessage: string;
}

const SubmitButton = ({ submitDisabled, onSubmit, loading, error, disabledMessage }: SubmitButtonProps) => (
    <div className="mt-4">
        {submitDisabled && (
            <div className="flex justify-start gap-2 items-center text-red-500">
                <IoIosWarning size={16} />
                <span>{disabledMessage}</span>
            </div>
        )}
        <Button className="w-full mt-3" disabled={submitDisabled} onClick={onSubmit}>
            {loading ? <Spinner /> : "S'inscrire"}
        </Button>
        {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
);

export default SubmitButton;
