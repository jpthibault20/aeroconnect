import React from 'react'
import { getDaysOfWeek } from '@/api/date';

interface props {
    className?: string
    date: Date;
}

const TableColumnNames = ({ className, date }: props) => {
    const daysOfWeek = getDaysOfWeek(date);

    return (
        <div className={`${className} flex justify-between px-16 mb-3 ml-10`}>
            {daysOfWeek.map((item) => (
                <div
                    key={item.dayNumber}
                    className={`w-[10%] flex items-center justify-center rounded-md ${item.isToday ? 'bg-[#373573]' : 'bg-[#373573]'}`}
                >
                    <div>
                        <p className={`font-istok text-xl ${item.isToday ? 'text-white' : 'text-black'}`}>
                            {item.dayName}
                        </p>
                        <p className={`font-istok font-semibold text-xl text-center ${item.isToday ? 'text-white' : 'text-black'}`}>
                            {item.dayNumber}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default TableColumnNames
