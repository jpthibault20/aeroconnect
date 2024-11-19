import React, { useEffect, useState } from 'react'
import { Switch } from '../ui/switch'
import { User } from '@prisma/client';
import { blockUser } from '@/api/db/users';
import { toast } from '@/hooks/use-toast';

interface props {
    user: User;
}

const Restricted = ({ user }: props) => {
    const [blocked, setBlocked] = useState(user.restricted)

    useEffect(() => {
        blockUser(user.id, blocked)
    }, [blocked, user])

    const onChangeRestricted = () => {
        const blockUserAction = async () => {
            try {
                setBlocked(!blocked)
            } catch (error) {
                console.log(error)
                toast({
                    title: "Oups, une erreur est survenue",
                    description: "contactez un administrateur pour modifier votre compte",
                    style: {
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                    },
                    duration: 3000,
                });
            } finally {
                toast({
                    title: "Utilisateur modifié avec succès",
                    duration: 3000,
                });
            }
        }
        blockUserAction()
    }

    return (
        <div>
            <Switch checked={blocked} onCheckedChange={onChangeRestricted} />
            <p>
                {blocked ? 'Oui' : 'Non'}
            </p>
        </div>
    )
}

export default Restricted
