import React from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface props {
    label: string
    id: string
    value: string | null
    loading: boolean
    onChange?: (value: string) => void;
    style?: string
    styleInput?: string
}

const InputComponent = ({ label, id, value, loading, onChange, style, styleInput }: props) => {
    return (
        <div className={style}>
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                value={value || ''}
                disabled={loading}
                onChange={(e) => onChange?.(e.target.value)}
                className={`bg-white ${styleInput}`}
            />
        </div>
    )
}

export default InputComponent
