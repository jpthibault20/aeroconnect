import React from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatDate } from '@/api/date';

interface SessionHeaderProps {
    sessionStartDate: Date;
}

const SessionHeader = ({ sessionStartDate }: SessionHeaderProps) => (
    <DialogHeader>
        <DialogTitle>Détails de la session</DialogTitle>
        <DialogDescription className="flex flex-col">
            Session du {formatDate(sessionStartDate)}
        </DialogDescription>
    </DialogHeader>
);

export default SessionHeader;
