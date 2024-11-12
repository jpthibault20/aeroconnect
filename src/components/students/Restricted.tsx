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
                });
            } finally {
                toast({
                    title: "Utilisateur modifié avec succès",
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
