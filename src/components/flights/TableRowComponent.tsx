import React from 'react'
import { TableCell, TableRow } from '../ui/table'
import { Checkbox } from '../ui/checkbox'
import { FLIGHT_SESSION } from '@prisma/client'

interface props {
    session: FLIGHT_SESSION
    setSessionChecked: React.Dispatch<React.SetStateAction<number[]>>

}

const TableRowComponent = ({ session, setSessionChecked }: props) => {

    const finalDate = new Date(session.sessionDateStart)
    finalDate.setMinutes(finalDate.getMinutes() + session.sessionDateDuration_min)

    const onChecked = (sessionId: number) => {
        setSessionChecked((prev) => {
            if (prev.includes(sessionId)) {
                // Si l'ID de session est déjà dans l'état, retire-le
                return prev.filter(id => id !== sessionId);
            } else {
                // Sinon, ajoute l'ID de session
                return [...prev, sessionId];
            }
        });
    };
    ;

    return (
        <TableRow className='font-istok'>
            <TableCell>
                <Checkbox onCheckedChange={() => onChecked(session.id)} />
            </TableCell>
            <TableCell>
                {session.sessionDateStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </TableCell>
            <TableCell>
                {session.sessionDateStart.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </TableCell>
            <TableCell>
                {finalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </TableCell>
            <TableCell>
                {session.finalReccurence !== null ? ('OUI') : ('NON')}
            </TableCell>
            <TableCell>
                {session.studentFirstName}
            </TableCell>
            <TableCell>
                {session.flightType}
            </TableCell>
            <TableCell>
                action
            </TableCell>
        </TableRow>
    )
}

export default TableRowComponent
