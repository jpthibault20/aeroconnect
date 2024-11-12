import React from 'react'
import { Button } from "@/components/ui/button"
import { Spinner } from '../ui/SpinnerVariants'

interface Props {
    title: string
    loading: boolean
}

const ButtonForm = ({ title, loading }: Props) => {
    return (
        <div className='w-full'>
            {loading ? (
                <div className='w-full bg-[#392060] text-primary-foreground shadow'>
                    <Spinner className='text-white' />
                </div>

            ) : (
                <Button
                    variant="perso"
                    className='w-full'
                    type='submit'
                    disabled={loading}
                >
                    {title}
                </Button>
            )}
        </div>
    )
}

export default ButtonForm
