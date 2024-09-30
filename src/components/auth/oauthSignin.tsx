"use client";

import { Provider } from '@supabase/supabase-js'
import React from 'react'
import { FcGoogle } from "react-icons/fc";
import { Button } from '../ui/button';
import { oAuthSignin } from '@/app/auth/login/action';

type OAuthProvider = {
    name: Provider,
    displayName: string,
    icon?: JSX.Element,
}

const OauthSignin = () => {
    const providers: OAuthProvider[] = [{
        name: 'google',
        displayName: 'Google',
        icon: <FcGoogle className='size-5' />,
    },];

    return (
        <div className='font-istok flex space-x-2'>
            {providers.map((provider) => (
                <div
                    key={provider.name}
                    className="flex-1"
                >
                    <Button
                        className='w-full' // Chaque bouton occupe la pleine largeur de son conteneur
                        variant={'outline'}
                        onClick={async () => await oAuthSignin(provider.name)}
                    >
                        {provider.icon}
                        {/* Se connecter avec {provider.displayName} */}
                    </Button>
                </div>
            ))}
        </div>

    )
}

export default OauthSignin
