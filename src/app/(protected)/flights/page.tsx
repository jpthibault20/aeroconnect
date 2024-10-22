"use client"
import React, { useEffect, useState } from 'react'
import InitialLoading from '@/components/InitialLoading'
import TableComponent from "@/components/flights/TableComponent"
import { flightsSessionsExemple } from '@/config/exempleData'
import { Button } from '@/components/ui/button'
import { LuSettings2 } from "react-icons/lu";


const Page = () => {
    const [sessionChecked, setSessionChecked] = useState<number[]>([])

    useEffect(() => {
        console.log(sessionChecked)
    }, [sessionChecked])

    const onClickAction = () => {
        console.log("action")
    }
    const onClickfilter = () => {
        console.log("filter")
    }

    return (
        <InitialLoading className='h-full p-6'>
            <div className='font-istok flex space-x-3'>
                <p className='font-medium text-3xl'>Les vols</p>
                <p className='text-[#797979] text-3xl'>{flightsSessionsExemple.length}</p>
            </div>
            <div className='my-3 flex justify-between'>
                <Button onClick={onClickAction} className='bg-[#774BBE]'>
                    Action
                </Button>
                <button className='bg-[#774BBE] rounded-full flex items-center justify-center p-2' onClick={onClickfilter}>
                    <LuSettings2 size={20} color='white' />
                </button>
            </div>
            <TableComponent
                sessions={flightsSessionsExemple}
                setSessionChecked={setSessionChecked}
            />
        </InitialLoading>
    )
}

export default Page
