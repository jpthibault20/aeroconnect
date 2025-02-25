import { InvitedStudent } from '@/api/db/users'
import React from 'react'

interface Props {
    invitedStudent: InvitedStudent
    setInvitedStudent: React.Dispatch<React.SetStateAction<InvitedStudent>>
}

const InvitedForm = ({ invitedStudent, setInvitedStudent }: Props) => {
  return (
    <div>
      InvitedForm
    </div>
  )
}

export default InvitedForm
