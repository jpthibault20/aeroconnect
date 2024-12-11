import {
    Link,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface MagicLinkEmailProps {
    magicLink?: string;
    clubName: string | null;
    clubAdress: clubAdressType;
}

export const MagicLinkEmail = ({ magicLink, clubName, clubAdress }: MagicLinkEmailProps) => (
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


        <EmailTemplate preview={"Inscription"} clubAdress={clubAdress} clubName={clubName}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Vous avez demandé une création de compte, voici le lien de validation d&apos;email :
                </Text>
                <Text className="text-lg leading-6">
                    <Link className="text-blue-500" href={magicLink}>
                        👉 Lien de confirmation 👈
                    </Link>
                </Text>
                <Text className="text-lg leading-6">
                    Si vous ne l&apos;avez pas demandé, veuillez ignorer cet e-mail...
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
);



export default MagicLinkEmail;
