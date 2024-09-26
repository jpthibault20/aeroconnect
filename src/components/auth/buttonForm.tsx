import React from 'react'
import { Button } from "@/components/ui/button"

interface Props {
    title: string
}

const ButtonForm = ({ title }: Props) => {
    return (
        <div className='w-full'>
            <Button
                variant="perso"
                className='w-full'
            >
                {title}
            </Button>
        </div>
    )
}

export default ButtonForm
