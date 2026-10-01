"use client"

import React, { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { User } from '@prisma/client';
import Header from './Header';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { useCurrentClub } from '@/app/context/useCurrentClub';
import { indexLinkDashboard, navigationLinks } from '@/config/links';
import InitialLoading from '../InitialLoading';
import SettingsPage from './SettingsPage';
import MembershipRequests from './MembershipRequests';
import PendingBaptemeRequests, { PendingBaptemeItem } from './PendingBaptemeRequests';
import StatsTab from './StatsTab';
import WalletTab from './WalletTab';
import ClubInfoCard from './ClubInfoCard';
import PublicBookingLinkRow from './PublicBookingLinkRow';
import ManagementOverview from './overview/ManagementOverview';
import PersonalOverview from './overview/PersonalOverview';
import { canManageClub, ClubTab, clubTabsFor, overviewKindFor, resolveClubTab } from '@/lib/clubAccess';

interface PageProps {
    clubID: string;
    UsersRequestedClubID: User[],
    users: User[],
    pendingBaptemes: PendingBaptemeItem[],
    publicBookingToken: string | null,
}

/**
 * "Club" page (AER-68): tabs synced with the URL (?tab=) so the phone's back
 * button returns to the previous tab. A visited tab stays mounted (hidden):
 * in-progress forms, chosen period and handled lists are kept when switching tabs.
 */
const PageComponent = ({ clubID, UsersRequestedClubID, users, pendingBaptemes, publicBookingToken }: PageProps) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const topRef = useRef<HTMLDivElement>(null);

    const [memberCount, setMemberCount] = useState(UsersRequestedClubID.length);
    const [baptemeCount, setBaptemeCount] = useState(pendingBaptemes.length);
    const [token, setToken] = useState<string | null>(publicBookingToken);

    useEffect(() => {
        if (!currentUser || !navigationLinks[indexLinkDashboard].roles.includes(currentUser.role)) {
            router.push('/calendar?clubID=' + clubID);
        }
    }, [currentUser, clubID, router]);

    const role = currentUser?.role;
    const isManagement = canManageClub(role);
    const tabs = clubTabsFor(role, {
        walletEnabled: !!currentClub?.walletEnabled,
        hasPendingBaptemes: pendingBaptemes.length > 0,
    });
    const active = resolveClubTab(searchParams.get('tab'), tabs);

    // Tabs already opened (updated during render, no effect).
    const [visited, setVisited] = useState<ClubTab[]>([active]);
    if (!visited.includes(active)) setVisited([...visited, active]);

    const selectTab = (tab: ClubTab) => {
        if (tab === active) return;
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'overview') params.delete('tab');
        else params.set('tab', tab);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
        topRef.current?.scrollIntoView({ block: 'start' });
    };

    const renderTab = (tab: ClubTab) => {
        switch (tab) {
            case 'overview': {
                const kind = overviewKindFor(role);
                if (kind === 'management') {
                    return (
                        <ManagementOverview
                            clubID={clubID}
                            publicToken={token}
                            pendingMembers={isManagement ? memberCount : 0}
                            pendingBaptemes={baptemeCount}
                            tabs={tabs}
                            onNavigate={selectTab}
                        />
                    );
                }
                if (kind === 'pilot' || kind === 'instructor') {
                    return <PersonalOverview kind={kind} clubID={clubID} publicToken={token} />;
                }
                return (
                    <div className="flex flex-col gap-4">
                        <ClubInfoCard />
                        <PublicBookingLinkRow clubID={clubID} token={token} />
                    </div>
                );
            }
            case 'todo':
                return (
                    <div className="flex flex-col gap-6">
                        {isManagement && (
                            <MembershipRequests UsersRequestedClubID={UsersRequestedClubID} onCountChange={setMemberCount} />
                        )}
                        <PendingBaptemeRequests pendingBaptemes={pendingBaptemes} onCountChange={setBaptemeCount} />
                    </div>
                );
            case 'stats':
                return <StatsTab />;
            case 'wallet':
                return <WalletTab />;
            case 'settings':
                return <SettingsPage users={users} clubID={clubID} publicToken={token} onTokenChange={setToken} />;
        }
    };

    const pendingTotal = (isManagement ? memberCount : 0) + baptemeCount;

    return (
        <InitialLoading className="min-h-screen max-h-screen overflow-y-auto bg-gray-100" clubIDURL={clubID}>
            <div ref={topRef} />
            <Header tabs={tabs} active={active} onSelect={selectTab} badges={{ todo: pendingTotal }} />
            <main className="container mx-auto px-4 pt-5 pb-28">
                {tabs.filter((tab) => visited.includes(tab)).map((tab) => (
                    <div key={tab} hidden={tab !== active}>
                        {renderTab(tab)}
                    </div>
                ))}
            </main>
        </InitialLoading>
    )
}

export default PageComponent
