"use client";
import { FLIGHT_SESSION } from "@prisma/client";
import React from "react";

interface Props {
    date: number;
    isToday: boolean;
    isActualMonth: boolean;
    isSelected?: boolean;
    flightSession: FLIGHT_SESSION[];
}

const RoundDate = ({ date, isToday, isActualMonth, isSelected, flightSession }: Props) => {
    let color = "#D9D9D9"; // couleur par défaut
    let oppacityColor = "#EBEBEB"

    const flightSessionAvailable = flightSession.filter((session) => session.studentID === null);
    const flightSessionBooked = flightSession.filter((session) => session.studentID !== null);

    if (flightSessionAvailable.length > 0) {
        color = "#B9DFC1";
        oppacityColor = "#E4F3E7";
    } else if (flightSessionBooked.length > 0) {
        color = "#DBA8A8";
        oppacityColor = "#ECD3D3";
    }

    const oppacityStyle = {
        backgroundColor: isActualMonth ? oppacityColor : "transparent",
    };

    const style = {
        backgroundColor: isActualMonth ? color : "transparent",
    };


    if (isSelected) {
        return (
            <div style={oppacityStyle} className="flex justify-center items-center bg-opacity-50 h-[40px] w-[40px] rounded-full">
                <div style={style} className="flex justify-center items-center h-[25px] w-[25px] rounded-full">
                    <p className={`${isToday ? 'font-bold' : 'font-normal'} text-sm font-istok`}>
                        {isActualMonth ? date : null}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className='text-sm font-istok flex'>
            <div className={`${isToday ? 'font-bold' : 'font-normal'} flex justify-center items-center rounded-full h-[40px] w-[40px]`}
                style={style}
            >
                <p>
                    {isActualMonth ? date : null}
                </p>
            </div>
        </div>
    )
}

export default RoundDate
