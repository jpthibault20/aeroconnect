import React from 'react'
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FLIGHT_SESSION } from '@prisma/client'
import TableRowComponent from './TableRowComponent'

interface props {
    sessions: FLIGHT_SESSION[]
    setSessionChecked: React.Dispatch<React.SetStateAction<number[]>>
}

const TableComponent = ({ sessions, setSessionChecked }: props) => {
    return (
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure de début</TableHead>
                    <TableHead>Heure de fin</TableHead>
                    <TableHead>Récurrent / Fin</TableHead>
                    <TableHead>Élève inscrit</TableHead>
                    <TableHead>Type de vol</TableHead>
                    <TableHead>Action</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {sessions.map((session, index) => (
                    <TableRowComponent
                        key={index}
                        session={session}
                        setSessionChecked={setSessionChecked}
                    />
                ))}
            </TableBody>
        </Table>
    )
}

export default TableComponent
