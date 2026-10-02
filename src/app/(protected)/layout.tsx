import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/api/db/users";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import Navigation from "@/components/navigation";
import prisma from "@/api/prisma";
import { CurrentClubWrapper } from "../context/useCurrentClub";
import { refreshDemoClubIfDue } from "@/api/demoClub";

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

    // Demo club: keep its activity around today (once per day, first visit).
    await refreshDemoClubIfDue(clubs.find((club) => club.id === user.clubID));

    return (
        <div className="h-full">
            <CurrentUserWrapper>
                <CurrentClubWrapper>
                    <UpdateContext userProp={user} clubProp={clubs.filter(club => club.id === user.clubID)[0]} />
                    <Navigation clubsProp={clubs}>{children}</Navigation>
                </CurrentClubWrapper>
            </CurrentUserWrapper>
        </div>
    );
}
