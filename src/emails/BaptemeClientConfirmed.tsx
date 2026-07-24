import {
    Hr,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface BaptemeClientConfirmedProps {
    firstName: string;
    startDate: string;
    endDate: string;
    planeName: string;
    clubName: string | null;
    clubAdress: clubAdressType;
    airfield: string | null;
    phoneContact: string | null;
    mailContact: string | null;
}

export const BaptemeClientConfirmed = ({
    firstName,
    startDate,
    endDate,
    planeName,
    clubName,
    clubAdress,
    airfield,
    phoneContact,
    mailContact,
}: BaptemeClientConfirmedProps) => (
    <Tailwind
        config={{ theme: { extend: { colors: { brand: "#007291" } } } }}
    >
        <EmailTemplate
            preview={"Votre vol baptême est confirmé !"}
            clubName={clubName}
            clubAdress={clubAdress}
        >
            <Section className="my-6">
                <Text className="text-2xl leading-7 font-bold">
                    C&apos;est confirmé, {firstName} ! 🎉
                </Text>
                <Text className="text-lg leading-6">
                    Nous avons le plaisir de vous confirmer votre vol baptême.
                    Toute l&apos;équipe {clubName} a hâte de vous accueillir.
                </Text>

                <Text className="text-lg leading-6 font-semibold">
                    Votre vol
                </Text>
                <Text className="text-lg leading-6">
                    📅 {startDate} ➡️ {endDate}
                    <br />
                    🛩️ Appareil : {planeName}
                    {airfield && (
                        <>
                            <br />
                            📍 Terrain : {airfield}
                        </>
                    )}
                </Text>

                <Hr className="border-gray-300 my-4" />

                <Text className="text-lg leading-6 font-semibold">
                    Le jour J, pensez à :
                </Text>
                <Text className="text-base leading-6">
                    • Arriver <strong>30 minutes avant</strong> l&apos;heure de
                    votre vol pour l&apos;accueil et le briefing.
                    <br />
                    • Vous munir d&apos;une <strong>pièce d&apos;identité</strong>.
                    <br />
                    • Prévoir une tenue confortable et des chaussures fermées.
                    <br />
                    • Vérifier la météo : en cas de conditions défavorables, nous
                    vous recontacterons pour reprogrammer votre vol.
                </Text>

                {(phoneContact || mailContact) && (
                    <>
                        <Text className="text-lg leading-6 font-semibold">
                            Une question ?
                        </Text>
                        <Text className="text-base leading-6">
                            {phoneContact && (
                                <>
                                    📞 {phoneContact}
                                    <br />
                                </>
                            )}
                            {mailContact && <>✉️ {mailContact}</>}
                        </Text>
                    </>
                )}

                <Text className="text-lg leading-6">
                    À très vite pour découvrir le plaisir du vol !
                </Text>
            </Section>
        </EmailTemplate>
    </Tailwind>
);

export default BaptemeClientConfirmed;
