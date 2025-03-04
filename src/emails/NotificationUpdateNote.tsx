import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate from "./Template";
import { Club, flight_sessions, User } from "@prisma/client";
import { formattedDate, receiveType } from "@/lib/utils";


/***
 * 
 */
interface NotificationUpdateNoteProps {
    receiver: receiveType;
    club: Club;
    session: flight_sessions;
    pilote: User;
    student: User;

}

export const NotificationUpdateNote = ({ receiver, club, session, pilote, student }: NotificationUpdateNoteProps) => (

    <Tailwind
        config={{
            theme: {
                extend: {
                    colors: {
                        brand: "#007291",
                    },
                },
            },
        }}
    >

        <EmailTemplate preview={"une note a été mise à jour"} clubName={club.Name} clubAdress={{ countrie: club.Country, zipCode: club.ZipCode, city: club.City, adress: club.Address }}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Les notes de la session du {formattedDate(session.sessionDateStart)} ont été mises à jour :
                </Text>
                {(receiver === receiveType.pilote || receiver === receiveType.all) && (
                    <Text className="text-lg leading-6">
                        Note élève : {session.studentComment}
                    </Text>
                )}
                {(receiver === receiveType.student || receiver === receiveType.all) && (
                    <Text className="text-lg leading-6">
                        Note pilote : {session.pilotComment}
                    </Text>
                )}
                <Text>
                    {receiver === receiveType.student ? `Élève : ${pilote.lastName.slice(0, 1).toUpperCase()}.${pilote.firstName}` :
                        receiver === receiveType.pilote ? `Pilote : ${student.lastName.slice(0, 1).toUpperCase()}.${student.firstName}` :
                            null
                    }
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationUpdateNote;
