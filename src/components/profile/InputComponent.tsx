import React, { useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Eye } from 'lucide-react'
import { UseFormRegister } from 'react-hook-form'

interface props {
    title: string
    value: string | null | undefined
    placeholder?: string
    disabled: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: UseFormRegister<any>
    className?: string
    htmlFor?: string
    type: string
    id: string
}

const InputComponent = ({ title, value, placeholder, disabled, className, htmlFor, type, id, register }: props) => {
    const [visibilityPassword, setVisibilityPassword] = useState("password")
    const [input, setInput] = useState(value ?? '')

    const onClickVisibilityPassword = () => {
        if (visibilityPassword == "password") setVisibilityPassword("text");
        else setVisibilityPassword("password");
    }

    if (id === "password" || id === "confirmPassword") {

        return (
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300" htmlFor="password">
                    {title}
                </label>
                <div className="mt-1 relative">
                    <Input
                        id={id}
                        placeholder={placeholder}
                        value={input}
                        disabled={disabled}
                        type={visibilityPassword}
                        {...register(id)}
                        onChange={(e) => setInput(e.target.value)}
                        className='p-3 bg-white border border-gray-300'
                    />
                    <Button className="absolute bottom-1 right-1 h-7 w-7" size="icon" variant="ghost" type="button" onClick={onClickVisibilityPassword}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Toggle password visibility</span>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={className}>
            <label htmlFor={htmlFor} className='font-medium'>
                {title}
            </label>
            <Input
                type={type}
                id={id}
                className='p-3 bg-white border border-gray-300'
                value={input}
                {...register(id)}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    )
}

export default InputComponent
