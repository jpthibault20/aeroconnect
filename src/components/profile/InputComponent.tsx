import React, { useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Eye } from 'lucide-react'

interface props {
    title: string
    defaultValue: string | null | undefined
    placeholder?: string
    disabled: boolean
    className?: string
    htmlFor: string
    type: string
    id: string
}

const InputComponent = ({ title, defaultValue, placeholder, disabled, className, htmlFor, type, id }: props) => {
    const [visibilityPassword, setVisibilityPassword] = useState("password")
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
                        id='password'
                        placeholder={placeholder}
                        defaultValue={defaultValue ?? ''}
                        disabled={disabled}
                        type={visibilityPassword}
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
                defaultValue={defaultValue ?? ''}
                placeholder={placeholder}
                disabled={disabled}
            />
        </div>
    )
}

export default InputComponent
