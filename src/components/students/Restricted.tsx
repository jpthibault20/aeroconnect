import React, { useState } from 'react'
import { Switch } from '../ui/switch'
import { User } from '@prisma/client';
import { blockUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/app/context/useCurrentUser';
import { clearCache } from '@/lib/cache';

interface props {
    user: User;
}

const Restricted = ({ user }: props) => {
    const [blocked, setBlocked] = useState(user.restricted)
    const { currentUser } = useCurrentUser()

    const onChangeRestricted = () => {
        const blockUserAction = async () => {
            try {
                const res = await blockUser(user.id, !blocked)
                if (res.success) {
                    setBlocked(!blocked)
                    clearCache(`users:${user.clubID}`)
                }
            } catch (error) {
                console.log(error)
                toast({
                    title: "Oups, une erreur est survenue",
                    duration: 5000,
                    style: {
                        background: '#ab0b0b', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
            } finally {
                toast({
                    title: "Utilisateur modifié avec succès",
                    duration: 5000,
                    style: {
                        background: '#0bab15', //rouge : ab0b0b
                        color: '#fff',
                    }
                });
            }
        }
        blockUserAction()
    }

    return (
        <div>
            <Switch
                checked={blocked}
                onCheckedChange={onChangeRestricted}
                disabled={["ADMIN", "OWNER", "MANAGER"].includes(currentUser?.role as string) ? false : ["ADMIN", "OWNER", "INSTRUCTOR"].includes(user.role as string)}
            />
            <p>
                {blocked ? 'Oui' : 'Non'}
            </p>
        </div>
    )
}

export default Restricted
