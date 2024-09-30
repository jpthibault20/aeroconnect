import React from 'react'
import { Button } from "@/components/ui/button"

interface Props {
    title: string
    loading: boolean
}

const ButtonForm = ({ title, loading }: Props) => {
    return (
        <div className='w-full'>
            <Button
                variant="perso"
                className='w-full'
                type='submit'
                disabled={loading}
            >
                {title}
            </Button>
        </div>
    )
}

export default ButtonForm
