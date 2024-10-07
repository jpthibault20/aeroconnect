"use client"
import React from 'react'
import { useExemple } from '@/app/context/useExemple'

const Exemple = () => {
    const { exemple, setExemple } = useExemple()
    return (
        <div>
            <div>
                {exemple}
            </div>
            <div>
                <button className='border-2 border-black p-1 rounded-xl' onClick={() => setExemple("test FAILED")}>changer</button>
            </div>
        </div>
    )
}

export default Exemple
