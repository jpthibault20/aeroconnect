import React, { } from 'react'
import InitialLoading from '../InitialLoading'
import { monthFr } from '@/config/date';


const GlobalCalendarDesktop = () => {
    const date = new Date();

    return (
        <InitialLoading className='hidden lg:block h-full'>
            {/* Conteneur parent en Flexbox */}
            <div className="flex flex-col h-full">

                {/* Première div : hauteur basée sur le contenu */}
                <div className='w-full'>
                    <p className='text-4xl font-istok'>
                        {monthFr[date.getMonth()]}, {date.getFullYear()}
                    </p>
                </div>

                {/* Deuxième div : prendra le reste de la hauteur disponible */}
                <div className='bg-[#E4E7ED] w-full flex-1 border-t-2 border-[#A5A5A5]'>
                    {/* Contenu de la deuxième div */}
                </div>

            </div>
        </InitialLoading>

    )
}

export default GlobalCalendarDesktop
