import React from 'react'
import { getDaysOfWeek } from '@/api/date';

interface props {
    className?: string
    date: Date;
}

const TableColumnNames = ({ className, date }: props) => {
    const daysOfWeek = getDaysOfWeek(date);

    return (
        <div className={`${className} flex justify-between px-16 mb-3`}>
            {daysOfWeek.map((item) => (
                <div
                    key={item.dayNumber}
                    className={`px-10 rounded-md ${item.isToday ? 'bg-[#373573]' : 'bg-background'}`}
                >
                    <p className={`font-istok text-xl ${item.isToday ? 'text-white' : 'text-black'}`}>
                        {item.dayName}
                    </p>
                    <p className={`font-istok font-semibold text-xl text-center ${item.isToday ? 'text-white' : 'text-black'}`}>
                        {item.dayNumber}
                    </p>

                </div>
            ))}
        </div>
    )
}

export default TableColumnNames
