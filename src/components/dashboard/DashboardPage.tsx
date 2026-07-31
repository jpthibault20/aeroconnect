import React from 'react'
import MembershipRequests from './MembershipRequests'
import MonthlyHoursChart from './MonthlyHoursChart'
import InstructorHoursChart from './InstructorHoursChart'
import AircraftHoursChart from './AircraftHoursChart'
import StudentHoursChart from './StudentHoursChart'
import PendingBaptemeRequests, { PendingBaptemeItem } from './PendingBaptemeRequests'
import PublicBookingLink from './PublicBookingLink'
import ClubInfoCard from './ClubInfoCard'
import { User } from '@prisma/client'
import { dashboardProps } from './ServerPageComp'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { canManageClub } from '@/lib/clubAccess'

interface Props {
    clubID: string,
    HoursByInstructor: dashboardProps[],
    hoursByPlanes: dashboardProps[],
    HoursByStudent: dashboardProps[],
    HoursByMonth: dashboardProps[],
    UsersRequestedClubID: User[],
    pendingBaptemes: PendingBaptemeItem[],
    publicBookingToken: string | null,
}
const DashboardPage = ({ clubID, HoursByInstructor, hoursByPlanes, HoursByStudent, HoursByMonth, UsersRequestedClubID, pendingBaptemes, publicBookingToken }: Props) => {
    const { currentUser } = useCurrentUser();
    const isManagement = canManageClub(currentUser?.role);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Informations pratiques : visibles par tous les membres */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <ClubInfoCard />
            </div>

            {/* Lien public baptême : consultable et partageable par tous les
                membres, régénérable par le président / l'admin uniquement. */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <PublicBookingLink clubID={clubID} initialToken={publicBookingToken} />
            </div>

            {/* Demandes d'adhésion : données nominatives, gestion uniquement */}
            {isManagement && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <MembershipRequests UsersRequestedClubID={UsersRequestedClubID} />
                </div>
            )}

            {/* Baptêmes en attente : la liste est déjà filtrée côté serveur (pilote
                assigné ou gestion). On masque le bloc aux membres qui n'ont rien à
                traiter pour ne pas leur afficher une carte vide en permanence. */}
            {(isManagement || pendingBaptemes.length > 0) && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <PendingBaptemeRequests pendingBaptemes={pendingBaptemes} />
                </div>
            )}

            {/* Statistiques : nominatives (instructeurs, élèves) ou internes au
                club, réservées à la gestion. */}
            {isManagement && (
                <>
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
                </>
            )}
        </div>
    )
}

export default DashboardPage
