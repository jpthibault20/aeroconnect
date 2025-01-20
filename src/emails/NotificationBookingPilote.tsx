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
    planeName: string
}

export const NotificationBookingPilote = ({ startDate, endDate, name, firstName, clubName, clubAdress, planeName }: NotificationBookingPiloteProps) => (
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
                    {firstName} {name.toUpperCase()} s&apos;est inscrit à une nouvelle session de vol le
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
                <Text className="text-lg leading-6">
                    avec l&apos;option : {planeName}
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationBookingPilote;
