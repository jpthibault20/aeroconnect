import { Club, planes } from "@prisma/client";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export enum receiveType {
  pilote,
  student,
  all,
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formattedDate = (date: Date) => {
  const formatedDateString = date.toISOString();

  return (`${formatedDateString.slice(8, 10)}/${formatedDateString.slice(5, 7)}/${formatedDateString.slice(0, 4)} ${formatedDateString.slice(11, 19)}`)

}

export const formatClubAdressString = (club: Club) => {
  return `${club.Country} ${club.ZipCode} ${club.City} ${club.Address}`
}

export const getPlaneName = (planeID: string, planesProp: planes[]) => {
  if (planeID === "classroomSession") {
      return { name: "Théorique" };
  }
  if (planeID === "noPlane") {
      return { name: "Perso" };
  }
  const plane = planesProp.find((plane) => plane.id === planeID);
  return { name: plane?.name };

}