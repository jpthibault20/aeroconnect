"use client"
import { useEffect } from "react";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import { useRouter } from 'next/navigation';
import { getSession } from "@/api/db/db";
import Navigation from "@/components/navigation"

export default function ProtectLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const router = useRouter();

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const auth = await getSession();
                if (!auth) {
                    router.push('/auth/login')
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
                console.log(err)
                router.push('/auth/login')

            }
        }
        fetchSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    return (
        <CurrentUserWrapper>
            <UpdateContext />
            <Navigation>
                {children}
            </Navigation>
        </CurrentUserWrapper>
    );
}
