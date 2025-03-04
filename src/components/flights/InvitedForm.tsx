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
        <div className='space-y-2 border-t border-b border-gray-300 p-4'>
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
                className="items-center"
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
                className="items-center"
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
