import React from 'react';
import InputComponent from '../InputComponent';
import { FaArrowRight } from 'react-icons/fa';
import { formatDate } from '@/api/date';

interface SessionDateProps {
    startDate: Date;
    endDate: Date;
}

const SessionDate = ({ startDate, endDate }: SessionDateProps) => (
    <div className="grid grid-cols-5">
        <div className="col-span-2">
            <InputComponent label="Début de la session" id="start" value={formatDate(startDate)} loading={true} styleInput="border border-gray-400" />
        </div>
        <div className="h-full w-full flex items-center justify-center col-span-1">
            <FaArrowRight />
        </div>
        <div className="col-span-2">
            <InputComponent label="Fin de la session" id="end" value={formatDate(endDate)} loading={true} styleInput="border border-gray-400" />
        </div>
    </div>
);

export default SessionDate;
