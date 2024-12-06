import { FC, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User } from '@prisma/client'
import { useCurrentUser } from '@/app/context/useCurrentUser'
import { getAllUserRequestedClubID } from '@/api/db/users'



const MembershipRequests: FC = () => {
  const { currentUser } = useCurrentUser();
  const [membershipRequests, setMembershipRequests] = useState<User[]>([]);

  useEffect(() => {
    const fetchMembershipRequests = async () => {
      if (!currentUser?.clubID) return;
      try {
        const res = await getAllUserRequestedClubID(currentUser?.clubID);
        if (Array.isArray(res)) {
          setMembershipRequests(res);
        } else {
          console.error("Unexpected response format", res);
        }
      } catch (error) {
        console.error("Failed to fetch membership requests", error);
      }
    }
    fetchMembershipRequests();
  }, [currentUser?.clubID]);

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
                {/* <TableCell>{request.requestDate}</TableCell> */}
                <TableCell>
                  <Button variant="outline" className="mr-2">Accepter</Button>
                  <Button variant="outline" className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-black">Rejeter</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {membershipRequests.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Aucune demande d&apos;adhésion.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MembershipRequests

