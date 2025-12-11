/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User } from '@prisma/client'
import { rejectMembershipRequest } from '@/api/db/club'
import AcceptMemberInClub from './AcceptMemberInClub'
import { Mail, Phone, User as UserIcon, X, Check } from 'lucide-react'

interface MembershipRequestsProps {
  UsersRequestedClubID: User[];
}

const MembershipRequests = ({ UsersRequestedClubID }: MembershipRequestsProps) => {
  const [membershipRequests, setMembershipRequests] = useState<User[]>(UsersRequestedClubID);

  const onClickReject = (user: User) => {
    rejectMembershipRequest(user.id);
    setMembershipRequests(membershipRequests.filter(req => req.id !== user.id));

    window.dispatchEvent(new Event('refresh-club-requests'));
  };

  return (
    <Card className="border-none shadow-none md:border md:shadow-sm bg-transparent md:bg-white">
      <CardHeader className="px-0 md:px-6">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Demandes d&apos;adhésion
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">
            {membershipRequests.length}
          </span>
        </CardTitle>
        <CardDescription>Gérez les nouveaux membres en attente.</CardDescription>
      </CardHeader>

      <CardContent className="p-0 md:p-6">

        {/* --- VUE MOBILE : CARTES (Affiché uniquement sur petit écran) --- */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {membershipRequests.map((request) => (
            <div key={request.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
              {/* En-tête Carte */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-[#774BBE] font-bold border border-purple-100">
                    {request.firstName?.charAt(0).toUpperCase()}{request.lastName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{request.firstName} {request.lastName}</h4>
                    <p className="text-xs text-slate-500">Nouvel utilisateur</p>
                  </div>
                </div>
              </div>

              {/* Infos Contact */}
              <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{request.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{request.phone || "Non renseigné"}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 w-full"
                  onClick={() => onClickReject(request)}
                >
                  <X className="w-4 h-4 mr-2" /> Rejeter
                </Button>

                {/* Composant d'acceptation (Doit être adapté pour prendre la largeur si besoin) */}
                <div className="w-full">
                  <AcceptMemberInClub
                    membershipRequests={membershipRequests}
                    setMembershipRequests={setMembershipRequests}
                    userRequest={request}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- VUE BUREAU : TABLEAU (Caché sur mobile) --- */}
        <div className="hidden md:block rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold">Identité</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {membershipRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {request.firstName?.charAt(0).toUpperCase()}{request.lastName?.charAt(0).toUpperCase()}
                      </div>
                      {request.lastName} {request.firstName}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{request.email}</TableCell>
                  <TableCell className="text-slate-600">{request.phone || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <AcceptMemberInClub
                        membershipRequests={membershipRequests}
                        setMembershipRequests={setMembershipRequests}
                        userRequest={request}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onClickReject(request)}
                      >
                        Rejeter
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty State */}
        {membershipRequests.length === 0 && (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 mt-4 md:mt-0">
            <div className="mx-auto h-12 w-12 text-slate-300 mb-3">
              <UserIcon className="h-full w-full" />
            </div>
            <h3 className="text-sm font-medium text-slate-900">Aucune demande</h3>
            <p className="text-sm text-slate-500 mt-1">Il n&apos;y a pas de nouvelles demandes d&apos;adhésion pour le moment.</p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export default MembershipRequests