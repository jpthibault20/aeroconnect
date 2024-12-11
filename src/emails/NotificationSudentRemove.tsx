import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface NotificationSudentRemoveProps {
    startDate: string;
    endDate: string
    clubName: string | null;
    clubAdress: clubAdressType;
}

export const NotificationSudentRemove = ({ startDate, endDate, clubName, clubAdress }: NotificationSudentRemoveProps) => (
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


        <EmailTemplate preview={"Oups une heure à était annulé"} clubName={clubName} clubAdress={clubAdress}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Mauvaise nouvelle, votre vol :
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
                <Text className="text-lg leading-6">
                    doit être annulé. N&apos;hésitez pas à réserver un nouveau créneau horaire.
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationSudentRemove;
