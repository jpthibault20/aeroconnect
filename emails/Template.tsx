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

interface EmailTemplateProps {
    children: React.ReactNode;
    preview: string;
}

export const EmailTemplate = ({children, preview}: EmailTemplateProps) => (
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
                    <Head className=""><h1>Vol Evasion</h1></Head>
                    {children}
                    <Text className="text-lg leading-6">
                        Salutation,
                        <br />- L&apos;équipe Vol Evasion -
                    </Text>
                    <Hr className="border-gray-300 mt-12" />
                    <Text className="text-sm text-blue-gray-500 text-gray-500">Vol evasion</Text>
                    <Text className="text-sm text-blue-gray-500 text-gray-500">57170 Fresnes-en-Saulnois</Text>
                </Container>
            </Body>
        </Html>
    </Tailwind>
);



export default EmailTemplate;
