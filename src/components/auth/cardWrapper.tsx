import React from 'react'
import Image from 'next/image'

interface Props {
    children: React.ReactNode
    title: string
}
const CardWrapper = ({ children, title }: Props) => {
    return (

        <div
            className="h-screen w-screen flex justify-center items-center"
            style={{ backgroundImage: "url(/static/images/planeBackground.jpg)" }}
        >
            <div className='w-[400px] bg-white rounded-xl shadow-2xl flex flex-col py-10'>
                <div className='flex flex-col items-center'>
                    <Image
                        src="/images/logo.svg"
                        alt="Logo"
                        width={100}
                        height={100}
                        className=''
                    />
                    <h1 className='font-istok text-[#323232] text-2xl text-center mt-4'>AeroConnect</h1>
                    <h3 className='text-[#64748B] mt-4'>{title}</h3>
                </div>
                {children}
            </div>
        </div>
    )
}

export default CardWrapper
