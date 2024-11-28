import {
    Link,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate from "./Template";

interface NotificationSudentRemoveForPilotProps {
    startDate: string;
    endDate: string
}

export const NotificationSudentRemoveForPilot = ({ startDate, endDate}: NotificationSudentRemoveForPilotProps) => (
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


        <EmailTemplate preview={"Oups un élèvé ses désinscrit"}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Mauvaise nouvelle, un élève s&apos;est désinscrit du vol : 
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationSudentRemoveForPilot;
