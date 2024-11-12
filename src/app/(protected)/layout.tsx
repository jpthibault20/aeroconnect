// ProtectLayout.tsx
"use client";
import { useEffect, useState } from "react";
import { CurrentUserWrapper } from "../context/useCurrentUser";
import UpdateContext from "@/components/UpdateContext";
import { useRouter } from 'next/navigation';
import { getUser } from "@/api/db/users";
import Navigation from "@/components/navigation";
import { User } from "@prisma/client";

export default function ProtectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [userState, setUserState] = useState<User | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { user } = await getUser();
            if (!user) {
                router.push('/auth/login');
            }
            else {
                setUserState(user);
            }
        };

        checkUser();
    }, [router]);

    return (
        <div className="h-full">
            <CurrentUserWrapper >
                <UpdateContext userProp={userState} />
                <Navigation>{children}</Navigation>
            </CurrentUserWrapper>
        </div>
    );
}
