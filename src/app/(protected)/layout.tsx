import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/api/db/users";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import Navigation from "@/components/navigation";
import prisma from "@/api/prisma";
import { CurrentClubWrapper } from "../context/useCurrentClub";
import { refreshDemoClubIfDue } from "@/api/demoClub";
import ReloadOnMount from "@/components/ReloadOnMount";

export default async function ProtectLayout({
    children,
}: {
    children: ReactNode;
}) {
    const res = await getUser();
    const clubs = await prisma.club.findMany();

    if (res.error) {
        redirect('/auth/login');
    }

    const { user } = res;

    if (!user) {
        redirect('/auth/login');
    }

    // Demo club: normally refreshed at login / club switch. This catches a session
    // left open across midnight; the page rendered in parallel read the previous
    // data, hence the one-off reload.
    const demoRefreshed = await refreshDemoClubIfDue(clubs.find((club) => club.id === user.clubID));

    return (
        <div className="h-full">
            {demoRefreshed && <ReloadOnMount />}
            <CurrentUserWrapper>
                <CurrentClubWrapper>
                    <UpdateContext userProp={user} clubProp={clubs.filter(club => club.id === user.clubID)[0]} />
                    <Navigation clubsProp={clubs}>{children}</Navigation>
                </CurrentClubWrapper>
            </CurrentUserWrapper>
        </div>
    );
}
