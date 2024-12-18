import prisma from "@/api/prisma";
import { senderMailAdress } from "@/config/mail";
import AcceptedToClub from "@/emails/AcceptedToClub";
import MagicLinkEmail from "@/emails/MagicLink";
import NotificationBookingPilote from "@/emails/NotificationBookingPilote";
import NotificationBookingStudent from "@/emails/NotificationBookingStudent";
import NotificationSudentRemove from "@/emails/NotificationSudentRemove"
import NotificationSudentRemoveForPilot from "@/emails/NotificationSudentRemoveForPilot"
import { clubAdressType } from "@/emails/Template";
import { Club } from "@prisma/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.NEXT_PUBLIC_APP_URL;

const formattedDate = (date: Date) => {
  const formatedDateString = date.toISOString();

  return (`${formatedDateString.slice(8, 10)}/${formatedDateString.slice(5, 7)}/${formatedDateString.slice(0, 4)} ${formatedDateString.slice(11, 19)}`)

}

const getClubData = (clubID: string) => {
  const fetchClubData = async () => {
    try {
      const club = await prisma.club.findUnique({
        where: {
          id: clubID
        },
        select: {
          Country: true,
          ZipCode: true,
          City: true,
          Address: true,
          Name: true
        }
      });
      return { name: club?.Name, adress: { countrie: club?.Country, zipCode: club?.ZipCode, city: club?.City, adress: club?.Address } };
    } catch (error) {
      console.log(error)
    }
  }
  return fetchClubData()
}

export const sendVerificationEmail = async (email: string, token: string, clubID: string) => {
  const confirmLink = `${domain}/auth/new-verification?token=${token}`;
  const clubData = await getClubData(clubID);

  if (!clubData || !clubData.name) {
    throw new Error("Club data or club name is undefined");
  }

  const { name, adress } = clubData;

  await resend.emails.send({
    from: senderMailAdress,
    to: email,
    subject: "Confirmation de votre compte",
    react: MagicLinkEmail({ magicLink: confirmLink, clubName: name, clubAdress: adress as clubAdressType })
  });
};

export const sendNotificationBooking = async (email: string, studentFirstname: string, studentLastname: string, startDate: Date, endDate: Date, clubID: string) => {
  const formatedStartDate = formattedDate(startDate)
  const formatedEndDate = formattedDate(endDate)
  const clubData = await getClubData(clubID);

  if (!clubData || !clubData.name) {
    throw new Error("Club data or club name is undefined");
  }

  const { name, adress } = clubData;

  await resend.emails.send({
    from: senderMailAdress,
    to: email,
    subject: "Un élève s'est inscrit un vol",
    react: NotificationBookingPilote({ startDate: formatedStartDate, endDate: formatedEndDate, name: studentLastname, firstName: studentFirstname, clubName: name, clubAdress: adress as clubAdressType })
  });
}

export const sendStudentNotificationBooking = async (email: string, startDate: Date, endDate: Date, clubID: string) => {
  const formatedStartDate = formattedDate(startDate)
  const formatedEndDate = formattedDate(endDate)
  const clubData = await getClubData(clubID);

  if (!clubData || !clubData.name) {
    throw new Error("Club data or club name is undefined");
  }

  const { name, adress } = clubData;

  await resend.emails.send({
    from: senderMailAdress,
    to: email,
    subject: "Confirmation de votre inscription a un vol",
    react: NotificationBookingStudent({ startDate: formatedStartDate, endDate: formatedEndDate, clubName: name, clubAdress: adress as clubAdressType })
  });
}

export const sendNotificationRemoveAppointment = async (email: string, startDate: Date, endDate: Date, club: Club) => {
  const formatedStartDate = formattedDate(startDate)
  const formatedEndDate = formattedDate(endDate)

  if (!club || !club.Name) {
    throw new Error("Club data or club name is undefined");
  }

  const { Name } = club;

  const adress = {
    countrie: club.Country,
    zipCode: club.ZipCode,
    city: club.City,
    adress: club.Address
  }

  await resend.emails.send({
    from: senderMailAdress,
    to: email,
    subject: "vol annulé",
    react: NotificationSudentRemove({ startDate: formatedStartDate, endDate: formatedEndDate, clubName: Name, clubAdress: adress })
  });

}

export const sendNotificationSudentRemoveForPilot = async (email: string, startDate: Date, endDate: Date, club: Club) => {
  const formatedStartDate = formattedDate(startDate)
  const formatedEndDate = formattedDate(endDate)

  if (!club || !club.Name) {
    throw new Error("Club data or club name is undefined");
  }

  const { Name } = club;

  const adress = {
    countrie: club.Country,
    zipCode: club.ZipCode,
    city: club.City,
    adress: club.Address
  }

  await resend.emails.send({
    from: senderMailAdress,
    to: email,
    subject: "vol annulé",
    react: NotificationSudentRemoveForPilot({ startDate: formatedStartDate, endDate: formatedEndDate, clubName: Name, clubAdress: adress })
  });
}

export const sendNotificationRequestClub = async (email: string, clubID: string) => {
  const clubData = await getClubData(clubID);

  if (!clubData || !clubData.name) {
    throw new Error("Club data or club name is undefined");
  }

  const { name, adress } = clubData;

  await resend.emails.send({
    from: senderMailAdress,
    to: email,
    subject: "Demande d'adhésion au club",
    react: AcceptedToClub({ clubName: name, clubAdress: adress as clubAdressType })
  });
}