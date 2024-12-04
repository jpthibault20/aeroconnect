"use client"

import React from 'react'
import Header from './Header';
import MembershipRequests from './MembershipRequests';
import MonthlyHoursChart from './MonthlyHoursChart';
import InstructorHoursChart from './InstructorHoursChart';
import AircraftHoursChart from './AircraftHoursChart';

interface PageProps {
    clubID: string;
    HoursByMonth: { month: string; hours: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PageComponent = ({ clubID, HoursByMonth }: PageProps) => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Header clubName="Aeroculb ULM du saulnois" />
            <main className="container mx-auto px-4 py-7">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <MembershipRequests />
                    </div>
                    <div className="col-span-1 md:col-span-2 lg:col-span-1">
                        <MonthlyHoursChart HoursByMonth={HoursByMonth} />
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <InstructorHoursChart />
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <AircraftHoursChart />
                    </div>
                </div>
            </main>
        </div>
    )
}

export default PageComponent
