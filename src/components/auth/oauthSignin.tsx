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
    }];

    return (
        <div className='font-istok'>
            {providers.map((provider) => (
                <Button 
                    className='w-full flex items-center justify-center gap-2'
                    variant={'outline'}
                    key={provider.name}
                    onClick={async() => await oAuthSignin(provider.name)}
                >
                    {provider.icon}
                    Se connecter avec {provider.displayName}
                </Button>
            ))}
        </div>
    )
}

export default OauthSignin
