/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User } from '@prisma/client'
import { acceptMembershipRequest, rejectMembershipRequest } from '@/api/db/club'
import AcceptMemberInClub from './AcceptMemberInClub'

interface MembershipRequestsProps {
  UsersRequestedClubID: User[];
}

const MembershipRequests = ({ UsersRequestedClubID }: MembershipRequestsProps) => {
  const [membershipRequests, setMembershipRequests] = useState<User[]>(UsersRequestedClubID);




  const onClickReject = (user: User) => {
    rejectMembershipRequest(user.id);
    setMembershipRequests(membershipRequests.filter(req => req.id !== user.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes d&apos;adhésion</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Prénom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Email</TableHead>
              {/* <TableHead>Date de demande</TableHead> */}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membershipRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.lastName}</TableCell>
                <TableCell>{request.firstName}</TableCell>
                <TableCell>{request.phone}</TableCell>
                <TableCell>{request.email}</TableCell>
                <TableCell>
                  <AcceptMemberInClub membershipRequests={membershipRequests} setMembershipRequests={setMembershipRequests} userRequest={request} />

                  <Button
                    variant="outline"
                    className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-black"
                    onClick={() => onClickReject(request)}
                  >
                    Rejeter
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {
          membershipRequests.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              Aucune demande d&apos;adhésion.
            </div>
          )}
      </CardContent>
    </Card>
  )
}

export default MembershipRequests

