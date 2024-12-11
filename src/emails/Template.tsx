import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Preview,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";

export interface clubAdressType {
    countrie: string | null;
    zipCode: string | null;
    city: string | null;
    adress: string | null;
}

interface EmailTemplateProps {
    children: React.ReactNode;
    preview: string;
    clubName: string | null;
    clubAdress: clubAdressType
}

export const EmailTemplate = ({ children, preview, clubName, clubAdress }: EmailTemplateProps) => (
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
        <Html>
            <Head />
            <Preview>{preview}</Preview>

            <Body className="bg-white font-sans">

                <Container className="mx-auto p-5 bg-bottom bg-no-repeat">
                    <Head className=""><h1>{clubName}</h1></Head>
                    {children}
                    <Text className="text-lg leading-6">
                        Salutation,
                        <br />- L&apos;équipe {clubName} -
                    </Text>
                    <Hr className="border-gray-300 mt-12" />
                    <Text className="text-sm text-blue-gray-500 text-gray-500">{clubAdress.countrie} {clubAdress.zipCode} {clubAdress.city} {clubAdress.adress}</Text>
                </Container>
            </Body>
        </Html>
    </Tailwind>
);



export default EmailTemplate;
