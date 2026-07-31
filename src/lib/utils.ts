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
 * Sentinelle historique « sans appareil / avion personnel », posée dans
 * flight_sessions.studentPlaneID avant l'arrivée des machines privées
 * (planes.ownerID), qui la remplacent avantageusement : une machine privée est
 * identifiée, suivie en heures et en maintenance.
 *
 * L'option a été RETIRÉE des formulaires : plus aucune séance ne peut naître
 * avec cette valeur. Les occurrences restantes sont uniquement des lectures,
 * conservées pour que les séances et vols DÉJÀ enregistrés continuent de
 * s'afficher correctement. À supprimer définitivement une fois les données
 * historiques migrées (cf. LEGACY_NO_PLANE_ID pour toutes les retrouver).
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