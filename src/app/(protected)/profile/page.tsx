"use client"
import { signOut } from '@/app/auth/login/action'
import { Button } from '@/components/ui/button'
import React from 'react'

const Page = () => {
    return (
        <div>
            profile page
            <div className='lg:hidden'>
                <Button 
                className=''
                    onClick={() => signOut()}>
                    Déconnexion
                </Button>
            </div>
        </div>
    )
}

export default Page
