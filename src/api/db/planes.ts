"use server";

import { MachineUsage, planes, userRole } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "../prisma";
import { requireAuth } from "./users";
import {
    canEditPlaneHobbs,
    canManagePlane,
    filterPlanesForBeneficiary,
    filterVisiblePlanes,
    PRIVATE_PLANE_OVERSIGHT_ROLES,
    resolveOfferedPlaneIDs,
    resolveOwnerReassignment,
    resolvePlaneCreation,
    sanitizeClubUsages,
} from "@/lib/planeVisibility";
import {
    buildPlaneImagePath,
    isPlaneImageMimeType,
    isPlaneImagePathOwnedBy,
    PLANE_IMAGE_BUCKET,
    validatePlaneImage,
} from "@/lib/planeImage";
import { createAdminClient } from "@/utils/supabase/admin";
import { sanitizeRateCents } from "@/lib/wallet";

// Roles allowed to book a student on a session (mirrors MANAGEMENT_ROLES in
// users.ts, which guards addStudentToSession).
const STUDENT_ASSIGN_ROLES: userRole[] = [userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

export interface CreatePlaneInput {
    clubID: string;
    name: string;
    immatriculation: string;
    classes: number;
    // 'club'    => club plane (owned by the club, management roles only).
    // 'private' => the creator's private plane.
    kind: "club" | "private";
    // Usages, club planes only.
    usageTypes?: MachineUsage[];
    // Instruction rate (cents/h), club planes only.
    instructionHourlyRateCents?: number | null;
}

export const createPlane = async (dataPlane: CreatePlaneInput) => {
    if (!dataPlane.name || !dataPlane.immatriculation || !dataPlane.clubID) {
        return { error: 'Missing required fields' };
    }

    // Any authenticated member can create a plane EXCEPT the base USER role.
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    if (auth.user.clubID !== dataPlane.clubID) {
        return { error: "Permissions insuffisantes" };
    }

    // Plane type + owner resolution (pure, tested logic).
    const resolution = resolvePlaneCreation(auth.user, dataPlane.kind, dataPlane.usageTypes ?? []);
    if ("error" in resolution) {
        return { error: resolution.error };
    }
    const { ownerID, usageTypes } = resolution;

    // Instruction rate: not applicable to a private plane (club instructor rate instead).
    const rate = sanitizeRateCents(dataPlane.instructionHourlyRateCents);
    if (rate === undefined) return { error: "Tarif écolage invalide" };
    const instructionHourlyRateCents = ownerID == null ? rate : null;

    try {
        // Reject a plane with the same name or registration
        const existingPlane = await prisma.planes.findFirst({
            where: {
                OR: [
                    { name: dataPlane.name, clubID: dataPlane.clubID },
                    { immatriculation: dataPlane.immatriculation, clubID: dataPlane.clubID },
                ],
            },
        });

        if (existingPlane) {
            return {
                error: 'Un avion existe déjà avec au moins un des champs entrés',
            };
        }

        await prisma.planes.create({
            data: {
                clubID: dataPlane.clubID,
                name: dataPlane.name,
                immatriculation: dataPlane.immatriculation,
                classes: dataPlane.classes,
                ownerID,
                usageTypes,
                instructionHourlyRateCents,
            },
        });

        // Return the planes VISIBLE to the creator for this club
        const planes = await prisma.planes.findMany({
            where: {
                clubID: dataPlane.clubID,
            },
        });

        return { success: 'Avion créé avec succès !', planes: filterVisiblePlanes(planes, auth.user) };

    } catch {
        return {
            error: 'Plane creation failed',
        };
    }
};


export const getPlanes = async (clubID: string) => {
    if (!clubID) {
        return { error: 'Missing clubID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return [];
    if (auth.user.clubID !== clubID) return [];

    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        });

        // Hide other members' private planes.
        return filterVisiblePlanes(planes, auth.user);
    } catch {
        return [];
    }
};

export const deletePlane = async (planeID: string) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const plane = await prisma.planes.findFirst({
            where: { id: planeID }
        });

        if (!plane || plane.clubID !== auth.user.clubID) {
            return { error: 'Plane not found' };
        }

        // Club plane => management roles; private plane => owner, president or admin.
        if (!canManagePlane(plane, auth.user)) {
            return { error: "Permissions insuffisantes" };
        }

        await prisma.planes.delete({
            where: { id: planeID }
        });

        // The row is gone: clean up the associated file so no orphan stays in the bucket.
        await removeStoredPlaneImage(plane.imagePath, planeID);

        return { success: 'Plane deleted successfully' };
    } catch {
        return { error: 'Plane deletion failed' };
    }
};

export const updateOperationalByID = async (planeID: string, operational: boolean) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: planeID } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }

        await prisma.planes.update({
            where: { id: planeID },
            data: { operational }
        });

        return { success: 'Plane updated successfully' };
    } catch {
        return { error: 'Plane update failed' };
    }
};

export const getAllPlanesOperational = async (clubID: string) => {
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };
    if (auth.user.clubID !== clubID) return { error: "Permissions insuffisantes" };

    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID,
                operational: true
            }
        })
        // Hide other members' private planes (but keep the current member's private
        // plane so they can book it).
        return filterVisiblePlanes(planes, auth.user);
    } catch {
        return { error: "Erreur lors de la récupération des avions" };
    }

}

export const updatePlane = async (plane: planes) => {
    if (!plane.id) {
        return { error: 'Missing planeID' };
    }
    if (!plane.name && !plane.immatriculation && !plane.operational && !plane.classes) {
        return { error: 'Missing plane data' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: plane.id } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }

        // Hobbs counter: management (OWNER/ADMIN) on any plane, and the owner on their
        // own private plane.
        const canEditHobbs = canEditPlaneHobbs(existing, auth.user);

        // Usages only apply to club planes: only updated for a club plane (ownerID
        // null), with valid values. The private/club type (ownerID) cannot change here.
        const nextUsageTypes = existing.ownerID == null
            ? sanitizeClubUsages(plane.usageTypes)
            : existing.usageTypes;

        // Instruction rate: club planes only (canManagePlane already guarantees a
        // management role for a club plane).
        const rate = sanitizeRateCents(plane.instructionHourlyRateCents);
        if (rate === undefined) return { error: "Tarif écolage invalide" };
        const nextRate = existing.ownerID == null && plane.instructionHourlyRateCents !== undefined
            ? rate
            : existing.instructionHourlyRateCents;

        await prisma.planes.update({
            where: { id: plane.id },
            data: {
                name: plane.name,
                immatriculation: plane.immatriculation,
                operational: plane.operational,
                classes: plane.classes,
                hobbsTotal: canEditHobbs ? plane.hobbsTotal : existing.hobbsTotal,
                usageTypes: nextUsageTypes,
                instructionHourlyRateCents: nextRate,
            }
        });

        return { success: 'Plane updated successfully' };
    } catch {
        return { error: 'Plane update failed' };
    }
};

/**
 * Reassigns a plane's owner: to a club member (it becomes private) or to the
 * club (newOwnerID null). President and admin only (see
 * PRIVATE_PLANE_OVERSIGHT_ROLES): an owner cannot reassign it themselves or
 * transfer their plane to another member.
 */
export const updatePlaneOwner = async (planeID: string, newOwnerID: string | null) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth(PRIVATE_PLANE_OVERSIGHT_ROLES);
    if ('error' in auth) return { error: auth.error };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: planeID } });
        if (!existing || existing.clubID !== auth.user.clubID) {
            return { error: 'Avion introuvable' };
        }

        let targetOwnerID: string | null = null;
        if (newOwnerID) {
            const targetUser = await prisma.user.findUnique({ where: { id: newOwnerID } });
            if (!targetUser || targetUser.clubID !== auth.user.clubID) {
                return { error: 'Membre introuvable dans ce club' };
            }
            targetOwnerID = targetUser.id;
        }

        const { ownerID, usageTypes } = resolveOwnerReassignment(targetOwnerID, existing.usageTypes);

        await prisma.planes.update({
            where: { id: planeID },
            data: { ownerID, usageTypes },
        });

        return { success: 'Propriétaire mis à jour', ownerID, usageTypes };
    } catch {
        return { error: 'Échec de la mise à jour du propriétaire' };
    }
};

/**
 * Deletes a photo file from the bucket. Best effort: an orphan file has no
 * functional impact, whereas failing here would fail a photo replacement or a
 * plane deletion.
 */
const removeStoredPlaneImage = async (imagePath: string | null, planeID: string) => {
    if (!imagePath || !isPlaneImagePathOwnedBy(imagePath, planeID)) return;

    const supabase = createAdminClient();
    if (!supabase) return;

    try {
        await supabase.storage.from(PLANE_IMAGE_BUCKET).remove([imagePath]);
    } catch {
        // Deliberately ignored (see comment above).
    }
};

/**
 * Uploads (or replaces) a plane's photo.
 *
 * The file comes in a FormData under the "file" key, already resized by the
 * browser (see PlaneImageInput). The server revalidates type and size: client
 * resizing is a convenience, never a guarantee.
 *
 * Saved immediately: the photo does not depend on the edit form's "Save" button.
 */
export const uploadPlaneImage = async (planeID: string, formData: FormData) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    const file = formData.get("file");
    if (!(file instanceof File)) {
        return { error: "Aucun fichier reçu." };
    }

    const invalid = validatePlaneImage({ type: file.type, size: file.size });
    if (invalid) return { error: invalid };
    // Redundant with validatePlaneImage, but this check narrows the type to the
    // subset accepted by buildPlaneImagePath.
    if (!isPlaneImageMimeType(file.type)) {
        return { error: "Format non supporté. Utilisez une image JPEG, PNG ou WebP." };
    }

    const supabase = createAdminClient();
    if (!supabase) {
        return { error: "Le stockage des photos n'est pas configuré sur ce serveur." };
    }

    try {
        const existing = await prisma.planes.findUnique({ where: { id: planeID } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }

        const imagePath = buildPlaneImagePath(planeID, randomUUID(), file.type);

        const { error: uploadError } = await supabase.storage
            .from(PLANE_IMAGE_BUCKET)
            .upload(imagePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
            return { error: "Échec de l'envoi de la photo." };
        }

        await prisma.planes.update({
            where: { id: planeID },
            data: { imagePath },
        });

        // The old photo is only deleted once the new one is in the DB: if something fails
        // in between, the plane keeps a valid photo.
        await removeStoredPlaneImage(existing.imagePath, planeID);

        return { success: 'Photo enregistrée', imagePath };
    } catch {
        return { error: "Échec de l'envoi de la photo." };
    }
};

/** Removes a plane's photo (file + DB reference). */
export const deletePlaneImage = async (planeID: string) => {
    if (!planeID) {
        return { error: 'Missing planeID' };
    }

    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: planeID } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }

        await prisma.planes.update({
            where: { id: planeID },
            data: { imagePath: null },
        });

        await removeStoredPlaneImage(existing.imagePath, planeID);

        return { success: 'Photo supprimée' };
    } catch {
        return { error: "Échec de la suppression de la photo." };
    }
};

/**
 * Planes that can be offered to a given student for a given slot.
 *
 * Loaded on demand by the "add a student" form: the calendar page only sends the
 * browser the planes visible to the current user (see filterVisiblePlanes in
 * calendar/ServerPageComp), so never the private plane of the student a manager
 * wants to book. The server resolves the list from the student's point of view,
 * without leaking other members' private planes.
 */
export const getPlanesForStudentOnSession = async (sessionID: string, studentID: string) => {
    const auth = await requireAuth(STUDENT_ASSIGN_ROLES);
    if ('error' in auth) return { error: auth.error };

    if (!sessionID || !studentID) {
        return { error: "Une erreur est survenue (E_001: paramètres invalides)" };
    }

    try {
        const session = await prisma.flight_sessions.findUnique({
            where: { id: sessionID },
            select: { id: true, clubID: true, planeID: true, sessionDateStart: true },
        });
        if (!session || session.clubID !== auth.user.clubID) {
            return { error: "Session introuvable ou non accessible." };
        }

        const student = await prisma.user.findUnique({ where: { id: studentID } });
        if (!student || student.clubID !== auth.user.clubID) {
            return { error: "Élève introuvable dans votre club." };
        }

        const [clubPlanes, concurrentSessions] = await Promise.all([
            prisma.planes.findMany({ where: { clubID: session.clubID, operational: true } }),
            prisma.flight_sessions.findMany({
                where: { clubID: session.clubID, sessionDateStart: session.sessionDateStart },
                select: { studentPlaneID: true },
            }),
        ]);

        const unavailablePlaneIDs = concurrentSessions
            .map((s) => s.studentPlaneID)
            .filter((id): id is string => id !== null);

        const planes = filterPlanesForBeneficiary(clubPlanes, student, {
            offeredPlaneIDs: resolveOfferedPlaneIDs(session.planeID, clubPlanes),
            unavailablePlaneIDs,
        });

        // Only return what the list needs (`isPrivate` visually distinguishes club and
        // private planes).
        return {
            success: true,
            planes: planes.map((p) => ({ id: p.id, name: p.name, isPrivate: p.ownerID != null })),
        };
    } catch {
        return { error: "Erreur lors de la récupération des machines." };
    }
};

/**
 * Instruction rate of a CLUB plane (AER-66), from the list's "Rates" dialog.
 * Management roles only (canManagePlane on a club plane), same club.
 * null => no rate.
 */
export const updatePlaneInstructionRate = async (planeID: string, rateCents: number | null) => {
    const auth = await requireAuth();
    if ('error' in auth) return { error: auth.error };

    const rate = sanitizeRateCents(rateCents);
    if (rate === undefined) return { error: "Tarif écolage invalide" };

    try {
        const existing = await prisma.planes.findUnique({ where: { id: planeID } });
        if (!existing || existing.clubID !== auth.user.clubID || !canManagePlane(existing, auth.user)) {
            return { error: 'Permissions insuffisantes' };
        }
        if (existing.ownerID != null) {
            return { error: "Une machine privée n'a pas de tarif écolage : c'est le tarif instructeur du club qui s'applique." };
        }
        await prisma.planes.update({ where: { id: planeID }, data: { instructionHourlyRateCents: rate } });
        return { success: 'Tarif écolage enregistré', instructionHourlyRateCents: rate };
    } catch {
        return { error: "Erreur lors de l'enregistrement du tarif" };
    }
};

// Roles that log a flight for a student (instructor) or on behalf of a member
// (president / admin / manager).
const FLIGHT_LOG_FOR_OTHERS_ROLES: userRole[] = [userRole.INSTRUCTOR, userRole.OWNER, userRole.ADMIN, userRole.MANAGER];

/**
 * A club member's private planes, for logging a flight: an instructor can log
 * the flight on THEIR student's private plane, which they do not see in the
 * plane list (see canLogFlightOnPlane).
 */
export const getMemberPrivatePlanes = async (memberID: string) => {
    const auth = await requireAuth(FLIGHT_LOG_FOR_OTHERS_ROLES);
    if ('error' in auth) return { error: auth.error };

    try {
        const member = await prisma.user.findUnique({ where: { id: memberID }, select: { clubID: true } });
        if (!member || !auth.user.clubID || member.clubID !== auth.user.clubID) {
            return { error: 'Permissions insuffisantes' };
        }
        const list = await prisma.planes.findMany({ where: { clubID: auth.user.clubID, ownerID: memberID } });
        return { success: true as const, planes: list };
    } catch {
        return { error: 'Erreur lors de la récupération des machines' };
    }
};
