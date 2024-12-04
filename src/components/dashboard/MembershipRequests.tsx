import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface MembershipRequest {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string
  requestDate: string
}

const membershipRequests: MembershipRequest[] = [
  { id: 1, firstName: 'Jean', lastName: 'Dupont', phone: '0123456789', email: 'jean.dupont@email.com', requestDate: '2023-05-15' },
  { id: 2, firstName: 'Marie', lastName: 'Martin', phone: '0987654321', email: 'marie.martin@email.com', requestDate: '2023-05-16' },
  { id: 3, firstName: 'Pierre', lastName: 'Durand', phone: '0654321987', email: 'pierre.durand@email.com', requestDate: '2023-05-17' },
]

const MembershipRequests: FC = () => {
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
              <TableHead>Date de demande</TableHead>
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
                <TableCell>{request.requestDate}</TableCell>
                <TableCell>
                  <Button variant="outline" className="mr-2">Accepter</Button>
                  <Button variant="outline" className="bg-red-100 text-red-600">Rejeter</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default MembershipRequests

