import {
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate from "./Template";

interface props {
    clubName: string
}

const AcceptedToClub = ({ clubName }: props) => (
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


        <EmailTemplate preview={"Inscription"}>
            <Section className="my-6">
                <Text className="text-lg leading-6">
                    Vous avez rejoint le club {clubName} !
                </Text>
                <Text className="text-lg leading-6">
                    Vous pouvez maintenant vous connecter à votre compte et accéder à toutes les fonctionnalités du club.
                </Text>
            </Section>
        </EmailTemplate>

    </Tailwind>
)

export default AcceptedToClub