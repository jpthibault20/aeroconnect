// ProtectLayout.tsx
"use client";
import { useEffect } from "react";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import { useRouter } from 'next/navigation';
import { getSession } from "@/api/db/users";
import Navigation from "@/components/navigation";

export default function ProtectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const auth = await getSession();
            if (!auth) {
                router.push('/auth/login');
            }
        };

        checkSession();
    }, [router]);

    return (
        <div className="h-full">
            <CurrentUserWrapper>
                <UpdateContext />
                <Navigation>{children}</Navigation>
            </CurrentUserWrapper>
        </div>
    );
}
