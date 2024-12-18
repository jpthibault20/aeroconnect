// actions/notifications.ts
'use server'

import { formattedDate, resend } from "@/lib/mail";
import prisma from "./prisma";
import NotificationSudentRemove from "@/emails/NotificationSudentRemove";
import NotificationSudentRemoveForPilot from "@/emails/NotificationSudentRemoveForPilot";


export const sendBackgroundNotifications = async (
    studentEmail: string | null | undefined, 
    piloteEmail: string | null | undefined, 
    sessionStart: Date, 
    sessionEnd: Date, 
    clubId: string
) => {
    // Validation précoce
    if (!studentEmail && !piloteEmail) {
        console.warn('No emails provided for notifications');
        return;
    }

    try {
        // Récupérer les informations du club
        const club = await prisma.club.findUnique({
            where: { id: clubId }
        });

        if (!club) {
            console.error('Club not found');
            return;
        }

        // Préparation des données communes
        const { 
            Name: clubName, 
            Country: countrie, 
            ZipCode: zipCode, 
            City: city, 
            Address: adress 
        } = club;

        const formatedStartDate = formattedDate(sessionStart);
        const formatedEndDate = formattedDate(sessionEnd);

        const clubAddress = { countrie, zipCode, city, adress };

        // Envoi des notifications en parallèle
        await Promise.all([
            studentEmail 
                ? resend.emails.send({
                    from: process.env.SENDER_MAIL_ADDRESS!,
                    to: studentEmail,
                    subject: "Vol annulé",
                    react: NotificationSudentRemove({ 
                        startDate: formatedStartDate, 
                        endDate: formatedEndDate, 
                        clubName, 
                        clubAdress: clubAddress 
                    })
                })
                : Promise.resolve(),

            piloteEmail
                ? resend.emails.send({
                    from: process.env.SENDER_MAIL_ADDRESS!,
                    to: piloteEmail,
                    subject: "Vol annulé",
                    react: NotificationSudentRemoveForPilot({ 
                        startDate: formatedStartDate, 
                        endDate: formatedEndDate, 
                        clubName, 
                        clubAdress: clubAddress 
                    })
                })
                : Promise.resolve()
        ]);

    } catch (error) {
        console.error('Background notification error:', error);
    }
};