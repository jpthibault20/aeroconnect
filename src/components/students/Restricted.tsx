import React, { useState } from 'react'
import { Switch } from '../ui/switch'
import { User } from '@prisma/client';

interface props {
    user: User;
}
const Restricted = ({ user }: props) => {
    const [blocked, setBlocked] = useState(user.restricted)

    const onChangeRestricted = () => {
        console.log('onChangeRestricted')
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
