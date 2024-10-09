"use client"
import { useEffect } from "react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { getUser } from "@/api/db/db";
import { User } from "@prisma/client";

const UpdateContext = () => {
    const { setCurrentUser } = useCurrentUser();

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await getUser();
                setCurrentUser(res.user as User);
            } catch (error) {
                console.log(error);
            }
        }

        fetchSession();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}

export default UpdateContext
