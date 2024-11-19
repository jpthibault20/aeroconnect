// UpdateContext.tsx
"use client";
import { useEffect } from "react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { User } from "@prisma/client";

interface Props {
    userProp: User | null;
}

const UpdateContext = ({ userProp }: Props) => {
    const { setCurrentUser } = useCurrentUser();

    useEffect(() => {
        if (userProp) {
            setCurrentUser(userProp);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProp]);


    return null;
};

export default UpdateContext;
