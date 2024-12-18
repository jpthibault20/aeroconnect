// ProtectLayout.tsx
"use server"
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/api/db/users";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import Navigation from "@/components/navigation";
import prisma from "@/api/prisma";

export default async function ProtectLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Récupérer les informations utilisateur côté serveur
    const res = await getUser();
    const clubs = await prisma.club.findMany();

    if (res.error) {
        console.error("Erreur lors de la récupération de l'utilisateur :", res.error);
        redirect('/auth/login');
    }

    const { user } = res;

    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
        redirect('/auth/login');
    }

    return (
        <div className="h-full">
            <CurrentUserWrapper>
                <UpdateContext userProp={user} />
                <Navigation clubsProp={clubs}>{children}</Navigation>
            </CurrentUserWrapper>
        </div>
    );
}
