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

/**
 * Historical "no plane / personal plane" sentinel, set in
 * flight_sessions.studentPlaneID before private planes (planes.ownerID) existed,
 * which advantageously replace it: a private plane is identified and tracked for
 * hours and maintenance.
 *
 * The option was REMOVED from the forms: no session can be created with this
 * value anymore. Remaining occurrences are reads only, kept so ALREADY recorded
 * sessions and flights still render correctly. To be removed for good once the
 * historical data is migrated (search LEGACY_NO_PLANE_ID to find them all).
 */
export const LEGACY_NO_PLANE_ID = "noPlane";

export const getPlaneName = (planeID: string, planesProp: planes[]) => {
  if (planeID === "classroomSession") {
      return { name: "Théorique" };
  }
  if (planeID === LEGACY_NO_PLANE_ID) {
      return { name: "Perso" };
  }
  const plane = planesProp.find((plane) => plane.id === planeID);
  return { name: plane?.name };

}