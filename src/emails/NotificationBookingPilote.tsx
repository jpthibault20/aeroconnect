import {
    Link,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate from "./Template";

interface NotificationBookingPiloteProps {
    name: string;
    firstName: string;
    startDate: string;
    endDate: string
}

export const NotificationBookingPilote = ({ startDate, endDate, name, firstName }: NotificationBookingPiloteProps) => (
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


        <EmailTemplate preview={"Une nouvelle heure réservé"}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    {firstName} {name} s&apos;est inscrit à une nouvelle heure de vol :
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationBookingPilote;
