// ProtectLayout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/api/db/users";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import Navigation from "@/components/navigation";

export default async function ProtectLayout({
    children,
}: {
    children: ReactNode;
}) {
    // Récupérer les informations utilisateur côté serveur
    const { user } = await getUser();

    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
        redirect('/auth/login');
    }

    return (
        <div className="h-full">
            <CurrentUserWrapper>
                <UpdateContext userProp={user} />
                <Navigation>{children}</Navigation>
            </CurrentUserWrapper>
        </div>
    );
}
