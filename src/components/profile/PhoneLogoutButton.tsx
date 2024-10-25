import React from 'react'
import { Button } from '../ui/button'
import { signOut } from '@/app/auth/login/action'

const PhoneLogoutButton = () => {
    return (
        <Button
            className='xl:hidden bg-[#774BBE] hover:bg-[#3d2365]'
            onClick={() => signOut()}>
            Déconnexion
        </Button>
    )
}

export default PhoneLogoutButton
