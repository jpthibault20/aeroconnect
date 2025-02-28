import { InvitedStudent } from '@/api/db/users'
import React from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'

interface Props {
    invitedStudent: InvitedStudent
    setInvitedStudent: React.Dispatch<React.SetStateAction<InvitedStudent>>
}

const InvitedForm = ({ invitedStudent, setInvitedStudent }: Props) => {
    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between'>
                <div
                    className="items-center"
                >
                    <Label>Nom</Label>
                    <Input
                        type="text"
                        className='w-full'
                        value={invitedStudent.lastName}
                        onChange={(e) => setInvitedStudent((prev) => ({ ...prev, lastName: e.target.value }))}
                    />
                </div>
                <div
                    className="items-center"
                >
                    <Label>Prénom</Label>
                    <Input
                        type="text"
                        className='w-full'
                        value={invitedStudent.firstName}
                        onChange={(e) => setInvitedStudent((prev) => ({ ...prev, firstName: e.target.value }))}
                    />
                </div>
            </div>
            <div
                className="flex items-center space-x-2"
            >
                <Label>Email</Label>
                <Input
                    type="text"
                    className='w-full'
                    value={invitedStudent.email}
                    onChange={(e) => setInvitedStudent((prev) => ({ ...prev, email: e.target.value }))}
                />
            </div>
            <div
                className="flex items-center space-x-2"
            >
                <Label>Téléphone</Label>
                <Input
                    type="text"
                    className='w-full'
                    value={invitedStudent.phone}
                    onChange={(e) => setInvitedStudent((prev) => ({ ...prev, phone: e.target.value }))}
                />
            </div>
        </div>
    )
}

export default InvitedForm
