// UpdateContext.tsx
"use client";
import { useEffect } from "react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Club, User } from "@prisma/client";
import { useCurrentClub } from "@/app/context/useCurrentClub";

interface Props {
    userProp: User | null;
    clubProp: Club;
}

const UpdateContext = ({ userProp, clubProp }: Props) => {
    const { setCurrentUser } = useCurrentUser();
    const { setCurrentClub } = useCurrentClub();

    useEffect(() => {
        if (userProp) {
            setCurrentUser(userProp);
        }
        if (clubProp) {
            setCurrentClub(clubProp);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProp]);


    return null;
};

export default UpdateContext;
