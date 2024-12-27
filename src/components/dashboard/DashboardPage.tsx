import React from 'react'
import MembershipRequests from './MembershipRequests'
import MonthlyHoursChart from './MonthlyHoursChart'
import InstructorHoursChart from './InstructorHoursChart'
import AircraftHoursChart from './AircraftHoursChart'
import StudentHoursChart from './StudentHoursChart'
import { User } from '@prisma/client'
import { dashboardProps } from './ServerPageComp'

interface Props {
    HoursByInstructor: dashboardProps[],
    hoursByPlanes: dashboardProps[],
    HoursByStudent: dashboardProps[],
    HoursByMonth: dashboardProps[],
    UsersRequestedClubID: User[],
}
const DashboardPage = ({ HoursByInstructor, hoursByPlanes, HoursByStudent, HoursByMonth, UsersRequestedClubID }: Props) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <MembershipRequests UsersRequestedClubID={UsersRequestedClubID} />
            </div>
            <div className="col-span-1 md:col-span-2">
                <MonthlyHoursChart HoursByMonth={HoursByMonth} />
            </div>
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
                <InstructorHoursChart HoursByInstructor={HoursByInstructor} />
            </div>
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
                <AircraftHoursChart hoursByPlanes={hoursByPlanes} />
            </div>
            <div className="col-span-1 md:col-span-2">
                <StudentHoursChart HoursByStudent={HoursByStudent} />
            </div>
        </div>
    )
}

export default DashboardPage
