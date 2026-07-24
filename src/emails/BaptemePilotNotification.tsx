import {
    Button,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface BaptemePilotNotificationProps {
    startDate: string;
    endDate: string;
    clubName: string | null;
    clubAdress: clubAdressType;
    planeName: string;
    clientFirstName: string;
    clientLastName: string;
    clientEmail: string;
    clientPhone: string;
    comment: string | null;
    validationLink: string;
}

export const BaptemePilotNotification = ({
    startDate,
    endDate,
    clubName,
    clubAdress,
    planeName,
    clientFirstName,
    clientLastName,
    clientEmail,
    clientPhone,
    comment,
    validationLink,
}: BaptemePilotNotificationProps) => (
    <Tailwind
        config={{ theme: { extend: { colors: { brand: "#007291" } } } }}
    >
        <EmailTemplate
            preview={"Un nouveau baptême attend votre validation"}
            clubName={clubName}
            clubAdress={clubAdress}
        >
            <Section className="my-6">
                <Text className="text-lg leading-6 font-semibold">
                    Un nouveau baptême attend votre validation.
                </Text>
                <Text className="text-lg leading-6">
                    {startDate} ➡️ {endDate}
                </Text>
                <Text className="text-lg leading-6">
                    Appareil : {planeName}
                </Text>
                <Text className="text-base leading-6">
                    Client : {clientFirstName} {clientLastName.toUpperCase()}
                    <br />
                    Email : {clientEmail}
                    <br />
                    Téléphone : {clientPhone}
                </Text>
                {comment && (
                    <Text className="text-base leading-6">
                        Commentaire du client : {comment}
                    </Text>
                )}
                <Text className="text-base leading-6">
                    Tant que vous n&apos;avez pas validé cette demande, le créneau
                    reste réservé provisoirement (le client n&apos;est pas encore
                    inscrit fermement).
                </Text>
                <Button
                    href={validationLink}
                    className="bg-brand text-white rounded-md px-5 py-3 text-base font-semibold"
                >
                    Valider ou refuser la demande
                </Button>
            </Section>
        </EmailTemplate>
    </Tailwind>
);

export default BaptemePilotNotification;
