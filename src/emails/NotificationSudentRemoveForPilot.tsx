import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface NotificationSudentRemoveForPilotProps {
    startDate: string;
    endDate: string;
    clubName: string | null;
    clubAdress: clubAdressType;
}

export const NotificationSudentRemoveForPilot = ({ startDate, endDate, clubName, clubAdress }: NotificationSudentRemoveForPilotProps) => (
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


        <EmailTemplate preview={"Oups un élèvé ses désinscrit"} clubName={clubName} clubAdress={clubAdress}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Mauvaise nouvelle, un élève n&apos;est plus inscrit au vol :
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationSudentRemoveForPilot;
