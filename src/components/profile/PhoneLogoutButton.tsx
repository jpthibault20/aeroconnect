import React from 'react'
import { Button } from '../ui/button'
import { signOut } from '@/app/auth/login/action'

interface Props {
    style?: string
}
const PhoneLogoutButton = ({ style }: Props) => {
    return (
        <Button
            className={`xl:hidden ${style}`}
            variant={'default'}
            onClick={() => signOut()}>
            Déconnexion
        </Button>
    )
}

export default PhoneLogoutButton
