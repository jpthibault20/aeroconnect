import {
    Hr,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

// Coordonnées du pilote qui assurera le vol, pour que le client puisse le
// joindre directement (retard, imprévu, météo).
export interface BaptemePilotContact {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
}

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
    pilot: BaptemePilotContact | null;
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
    pilot,
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

                {pilot && (
                    <>
                        <Text className="text-lg leading-6 font-semibold">
                            Votre pilote
                        </Text>
                        <Text className="text-base leading-6">
                            👨‍✈️ {pilot.firstName} {pilot.lastName.toUpperCase()}
                            {pilot.phone && (
                                <>
                                    <br />
                                    📞 {pilot.phone}
                                </>
                            )}
                            {pilot.email && (
                                <>
                                    <br />
                                    ✉️ {pilot.email}
                                </>
                            )}
                            <br />
                            <span className="text-gray-600">
                                Contactez-le directement en cas de retard ou d&apos;imprévu le
                                jour du vol.
                            </span>
                        </Text>
                    </>
                )}

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
