// UpdateContext.tsx
"use client";
import { useEffect } from "react";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import useUserData from "@/hooks/useUserData";

const UpdateContext = () => {
    const { setCurrentUser } = useCurrentUser();
    const { user, loading } = useUserData();

    useEffect(() => {
        if (user) {
            setCurrentUser(user);
        }
    }, [user, setCurrentUser]);

    if (loading) return <p>Chargement des données...</p>;

    return null;
};

export default UpdateContext;
