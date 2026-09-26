import {
    Button,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import * as React from "react";
import EmailTemplate, { clubAdressType } from "./Template";

interface props {
    firstName: string;
    balance: string; // already formatted amount ("12,50 €", "−12,50 €")
    isEmpty: boolean; // zero or negative balance => bookings blocked
    contactName: string | null;
    phoneContact: string | null;
    mailContact: string | null;
    walletLink: string;
    clubName: string;
    clubAdress: clubAdressType;
}

// Email sent only once when a student's / pilot's balance drops below the "low"
// threshold (AER-66): explains the situation and how to top up.
const WalletLowBalance = ({
    firstName, balance, isEmpty, contactName, phoneContact, mailContact, walletLink, clubName, clubAdress,
}: props) => (
    <Tailwind>
        <EmailTemplate preview={isEmpty ? "Votre solde est épuisé" : "Votre solde est faible"} clubAdress={clubAdress} clubName={clubName}>
            <Section className="my-6">
                <Text className="text-lg leading-6">Bonjour {firstName},</Text>
                <Text className="text-lg leading-6">
                    Le solde de votre portefeuille au club {clubName} est de <strong>{balance}</strong>.
                </Text>
                {isEmpty ? (
                    <Text className="text-lg leading-6">
                        Tant qu&apos;il n&apos;est pas rechargé, vous ne pouvez plus vous inscrire aux créneaux
                        d&apos;instruction. Vos réservations déjà faites sont conservées.
                    </Text>
                ) : (
                    <Text className="text-lg leading-6">
                        Pensez à recharger votre compte pour continuer à vous inscrire aux créneaux d&apos;instruction.
                    </Text>
                )}
                <Text className="text-lg leading-6">
                    Les paiements (espèces, chèque, virement, CB) se font directement auprès du club
                    {contactName ? <> : <strong>{contactName}</strong></> : null}
                    {phoneContact ? <> · {phoneContact}</> : null}
                    {mailContact ? <> · {mailContact}</> : null}.
                </Text>
                <Button
                    href={walletLink}
                    className="rounded-md bg-[#774BBE] px-5 py-3 text-white"
                >
                    Voir mon portefeuille
                </Button>
            </Section>
        </EmailTemplate>
    </Tailwind>
);

export default WalletLowBalance;
