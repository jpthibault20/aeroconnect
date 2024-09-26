import React from 'react'
import { Input } from "@/components/ui/input"

interface Props {
    title: string
    placeholder: string
    type: string
}

const InputString = ({ title, placeholder, type }: Props) => {
    return (
        <div>
            <div className=' space-y-1'>
                <h3 className='font-istok'>{title}</h3>
                <Input
                    type={type}
                    placeholder={placeholder}
                />
            </div>
        </div>
    )
}

export default InputString
