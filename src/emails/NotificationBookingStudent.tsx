import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface NotificationBookingStudentProps {
    startDate: string;
    endDate: string
    clubName: string | null;
    clubAdress: clubAdressType;
    planeName: string;
    pilotComment: string;
    studentComment: string;
}

export const NotificationBookingStudent = ({ startDate, endDate, clubName, clubAdress, planeName, pilotComment, studentComment }: NotificationBookingStudentProps) => (
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


        <EmailTemplate preview={"Inscription à une heure de vol"} clubAdress={clubAdress} clubName={clubName}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Vous êtes inscrit à une nouvelle session de vol :
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
                        Note élèvé : {studentComment}
                    </Text>
                )}
                <Text className="text-lg leading-6">Information : Veuillez prévoir 30 minutes avant le vol et 15 minutes après le vol.</Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default NotificationBookingStudent;
