import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react'

interface props {
    className?: string;
    onClickNextWeek?: () => void;
    onClickPreviousWeek?: () => void;
    onClickToday?: () => void;
}

const DaySelector = ({ className, onClickNextWeek, onClickPreviousWeek, onClickToday }: props) => {
    return (
        <div className={`${className} space-x-1 p-1`}>
            <button
                onClick={onClickPreviousWeek}
                className='flex bg-[#F2F2F2] px-1 py-0.5 rounded-sm'
            >
                <ChevronLeft />
            </button>
            <button
                onClick={onClickToday}
                className='flex bg-[#F2F2F2] px-3 py-0.5 rounded-sm'
            >
                Aujourd&apos;hui
            </button>
            <button
                onClick={onClickNextWeek}
                className='flex bg-[#F2F2F2] px-1  py-0.5 rounded-sm'
            >
                <ChevronRight />
            </button>
        </div>
    )
}

export default DaySelector
