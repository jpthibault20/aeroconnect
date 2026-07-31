import {
    Button,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface BaptemeClientRejectedProps {
    firstName: string;
    startDate: string;
    endDate: string;
    clubName: string | null;
    clubAdress: clubAdressType;
    bookingLink: string | null;
}

export const BaptemeClientRejected = ({
    firstName,
    startDate,
    endDate,
    clubName,
    clubAdress,
    bookingLink,
}: BaptemeClientRejectedProps) => (
    <Tailwind
        config={{ theme: { extend: { colors: { brand: "#007291" } } } }}
    >
        <EmailTemplate
            preview={"À propos de votre demande de baptême"}
            clubName={clubName}
            clubAdress={clubAdress}
        >
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Bonjour {firstName},
                </Text>
                <Text className="text-lg leading-6">
                    Nous vous remercions de l&apos;intérêt que vous portez à notre
                    club. Malheureusement, nous ne sommes pas en mesure de
                    confirmer votre demande de baptême pour le créneau du{" "}
                    {startDate} ➡️ {endDate}.
                </Text>
                <Text className="text-base leading-6">
                    Ce créneau n&apos;est plus disponible, mais nous serions ravis
                    de vous accueillir sur un autre horaire. N&apos;hésitez pas à
                    choisir un nouveau créneau qui vous convient.
                </Text>
                {bookingLink && (
                    <Button
                        href={bookingLink}
                        className="bg-brand text-white rounded-md px-5 py-3 text-base font-semibold"
                    >
                        Choisir un autre créneau
                    </Button>
                )}
                <Text className="text-base leading-6">
                    Au plaisir de vous compter bientôt parmi nous.
                </Text>
            </Section>
        </EmailTemplate>
    </Tailwind>
);

export default BaptemeClientRejected;
