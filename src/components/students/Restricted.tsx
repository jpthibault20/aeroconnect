import React, { useEffect, useState } from 'react'
import { Switch } from '../ui/switch'
import { User } from '@prisma/client';
import { blockUser } from '@/api/db/users';

interface props {
    user: User;
}

const Restricted = ({ user }: props) => {
    const [blocked, setBlocked] = useState(user.restricted)

    useEffect(() => {
        blockUser(user.id, blocked)
    }, [blocked, user])

    const onChangeRestricted = () => {
        setBlocked(!blocked)
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
