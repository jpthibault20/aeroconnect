import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface BaptemeClientReceivedProps {
    firstName: string;
    startDate: string;
    endDate: string;
    planeName: string;
    clubName: string | null;
    clubAdress: clubAdressType;
}

export const BaptemeClientReceived = ({
    firstName,
    startDate,
    endDate,
    planeName,
    clubName,
    clubAdress,
}: BaptemeClientReceivedProps) => (
    <Tailwind
        config={{ theme: { extend: { colors: { brand: "#007291" } } } }}
    >
        <EmailTemplate
            preview={"Votre demande de baptême a bien été reçue"}
            clubName={clubName}
            clubAdress={clubAdress}
        >
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Bonjour {firstName},
                </Text>
                <Text className="text-lg leading-6">
                    Merci ! Votre demande de vol baptême a bien été reçue. 🛩️
                </Text>
                <Text className="text-lg leading-6">
                    Créneau souhaité : {startDate} ➡️ {endDate}
                    <br />
                    Appareil : {planeName}
                </Text>
                <Text className="text-base leading-6">
                    Un membre de notre équipe va étudier votre demande. Vous
                    recevrez un second email dès qu&apos;elle sera confirmée. À
                    ce stade, votre place est réservée provisoirement.
                </Text>
                <Text className="text-base leading-6">
                    À très bientôt dans les airs !
                </Text>
            </Section>
        </EmailTemplate>
    </Tailwind>
);

export default BaptemeClientReceived;
