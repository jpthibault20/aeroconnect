import React from 'react'
import { Input } from "@/components/ui/input"

interface Props {
    title: string
    placeholder: string
    type: string
    id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: any
}

const InputString = ({ title, placeholder, type, id, register }: Props) => {
    return (
        <div>
            <div className=' space-y-1'>
                <label className='font-istok' htmlFor={id}>
                    {title}
                </label>
                <Input
                    type={type}
                    placeholder={placeholder}
                    id={id}
                    {...register(id)}
                />
            </div>
        </div>
    )
}

export default InputString
