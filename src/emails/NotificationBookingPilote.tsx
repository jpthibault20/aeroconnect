import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface NotificationBookingPiloteProps {
    name: string;
    firstName: string;
    startDate: string;
    endDate: string
    clubName: string | null;
    clubAdress: clubAdressType;
    planeName: string;
    pilotComment: string;
    studentComment: string;
}

export const NotificationBookingPilote = ({ startDate, endDate, name, firstName, clubName, clubAdress, planeName, pilotComment, studentComment }: NotificationBookingPiloteProps) => (
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


        <EmailTemplate preview={"Une nouvelle heure réservé"} clubName={clubName} clubAdress={clubAdress}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    {firstName} {name.toUpperCase()} s&apos;est inscrit à la session suivante : 
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
                <Text className="text-lg leading-6">
                    avec l&apos;option : {planeName}
                </Text>
                {pilotComment && (
                    <Text>
                        Note pilote : {pilotComment}
                    </Text>
                )}
                {studentComment && (
                    <Text>
                        Note élève : {studentComment}
                    </Text>
                )}
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationBookingPilote;
