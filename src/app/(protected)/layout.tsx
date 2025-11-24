// ============================================
// src/app/(protected)/layout.tsx
// ============================================
"use server"
import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getUser } from "@/api/db/users"
import { CurrentUserWrapper } from "../context/useCurrentUser"
import UpdateContext from "@/components/UpdateContext"
import Navigation from "@/components/navigation"
import prisma from "@/api/prisma"
import { CurrentClubWrapper } from "../context/useCurrentClub"

export default async function ProtectLayout({
    children,
}: {
    children: ReactNode
}) {
    // Récupérer les informations utilisateur côté serveur
    const res = await getUser()

    if (res.error) {
        console.error("Erreur lors de la récupération de l'utilisateur :", res.error)
        redirect('/auth/login')
    }

    const { user } = res

    // Rediriger si l'utilisateur n'est pas connecté
    if (!user) {
        redirect('/auth/login')
    }

    // Récupérer les clubs via Prisma
    const clubs = await prisma.club.findMany()
    const userClub = clubs.find(club => club.id === user.clubID)

    if (!userClub) {
        redirect('/auth/login')
    }

    return (
        <div className="h-full">
            <CurrentUserWrapper>
                <CurrentClubWrapper>
                    <UpdateContext
                        userProp={user}
                        clubProp={userClub}
                    />
                    <Navigation clubsProp={clubs}>{children}</Navigation>
                </CurrentClubWrapper>
            </CurrentUserWrapper>
        </div>
    )
}