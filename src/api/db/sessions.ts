"use server";

import { User } from '@prisma/client';
import { differenceInHours, isBefore } from 'date-fns';
import { sendStudentNotificationBooking, sendNotificationBooking, sendNotificationRemoveAppointment, sendNotificationSudentRemoveForPilot } from "@/lib/mail";
import prisma from '../prisma';

export interface interfaceSessions {
    date: Date | undefined;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
    duration: number;
    endReccurence: Date | undefined;
    planeId: string[];
}

export const newSession = async (sessionData: interfaceSessions, user: User) => {
    if (!sessionData) {
        return { error: "Une erreur est survenue (E_001: sessionData is undefined)" };
    }

    if (!sessionData.date) {
        return { error: "La date de la session est obligatoire" };
    }

    const now = new Date();

    if (new Date(sessionData.date.getFullYear(), sessionData.date.getMonth(), sessionData.date.getDate(), Number(sessionData.startHour), Number(sessionData.startMinute), 0).getTime() <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getUTCHours(), now.getUTCMinutes(), 0).getTime()) {
        return { error: "La date de session doit être dans le futur" };
    }

    const débutTotalMinutes = parseInt(sessionData.startHour) * 60 + parseInt(sessionData.startMinute);
    const finTotalMinutes = parseInt(sessionData.endHour) * 60 + parseInt(sessionData.endMinute);

    if (débutTotalMinutes >= finTotalMinutes) {
        return { error: "L'heure de fin doit être après l'heure de début" };
    }

    const différenceMinutes = finTotalMinutes - débutTotalMinutes;
    if (différenceMinutes < sessionData.duration || différenceMinutes % sessionData.duration !== 0) {
        return { error: `La durée de la session doit être supérieure à ${sessionData.duration} minutes et un multiple de ${sessionData.duration} minutes` };
    }

    if (sessionData.endReccurence && sessionData.endReccurence <= sessionData.date) {
        return { error: "La date de fin de récurrence doit être après la date de début" };
    }

    const baseSessionDateStart = new Date(Date.UTC(
        sessionData.date.getUTCFullYear(),
        sessionData.date.getUTCMonth(),
        sessionData.date.getUTCDate(),
        Number(sessionData.startHour),
        Number(sessionData.startMinute),
        0
    ));

    const sessionsToCreate: Date[] = [];
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const dateEndSession = new Date(Date.UTC(
        baseSessionDateStart.getUTCFullYear(),
        baseSessionDateStart.getUTCMonth(),
        baseSessionDateStart.getUTCDate(),
        Number(sessionData.endHour),
        Number(sessionData.endMinute),
        0
    ));

    if (sessionData.endReccurence) {
        sessionData.endReccurence.setUTCDate(sessionData.endReccurence.getUTCDate() + 1);
        for (let current = baseSessionDateStart; current <= sessionData.endReccurence; current = new Date(current.getTime() + oneWeekInMs)) {
            const sartCurrent = new Date(current.getTime());
            const endCurrent = new Date(current.getTime());
            endCurrent.setUTCHours(Number(sessionData.endHour), Number(sessionData.endMinute), 0);

            while (sartCurrent.getTime() < endCurrent.getTime()) {
                sessionsToCreate.push(new Date(sartCurrent));
                sartCurrent.setUTCMinutes(sartCurrent.getUTCMinutes() + sessionData.duration);
            }
        }
    } else {
        while (baseSessionDateStart.getTime() < dateEndSession.getTime()) {
            sessionsToCreate.push(new Date(baseSessionDateStart));
            baseSessionDateStart.setUTCMinutes(baseSessionDateStart.getUTCMinutes() + sessionData.duration);
        }
    }

    // Vérifier les conflits pour chaque session à créer avec une seule requête
    const existingSessions = await prisma.flight_sessions.findMany({
        where: {
            clubID: user.clubID as string,
            pilotID: user.id,
            sessionDateStart: { in: sessionsToCreate },
        }
    });
    prisma.$disconnect();

    if (existingSessions.length > 0) {
        return { error: "Une session existe déjà avec cette configuration pour l'une des dates." };
    }

    // Envoi des sessions à la base de données avec Prisma en une seule transaction
    try {
        const createdSessions = await prisma.$transaction(
            sessionsToCreate.map(sessionDateStart =>
                prisma.flight_sessions.create({
                    data: {
                        clubID: user.clubID as string,
                        sessionDateStart,
                        sessionDateDuration_min: sessionData.duration,
                        finalReccurence: sessionData.endReccurence,
                        pilotID: user.id,
                        pilotFirstName: user.firstName,
                        pilotLastName: user.lastName,
                        studentID: null,
                        studentFirstName: null,
                        studentLastName: null,
                        student_type: null,
                        planeID: sessionData.planeId,
                    }
                })
            )
        );
        prisma.$disconnect();

        return { success: "Les sessions ont été créées !", sessions: createdSessions };
    } catch (error) {
        console.error('Error creating flight sessions:', error);
        return { error: "Erreur lors de la création des sessions de vol" };
    }
};


export const getAllSessions = async (clubID: string, monthSelected: Date) => {

    try {
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID: clubID,
                sessionDateStart: {
                    gte: new Date(monthSelected.getFullYear(), monthSelected.getMonth(), 1, 0, 0, 0, 0),
                    lte: new Date(monthSelected.getFullYear(), monthSelected.getMonth() + 1, 0, 23, 59, 59, 999)
                },
            },
        });
        prisma.$disconnect();
        return sessions;
    } catch (error) {
        console.error('Error getting flight sessions:', error);
        return { error: "Erreur lors de la récupération des sessions de vol" };
    }

};

export const getAllFutureSessions = async (clubID: string) => {
    try {
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                clubID: clubID,
                sessionDateStart: {
                    gte: new Date()
                }
            }
        })
        prisma.$disconnect();
        return sessions;
    } catch (error) {
        console.error('Error getting flight sessions:', error);
        return { error: "Erreur lors de la récupération des sessions de vol" };
    }

};

export const getPlanes = async (clubID: string) => {
    try {
        const planes = await prisma.planes.findMany({
            where: {
                clubID: clubID
            }
        })
        prisma.$disconnect();
        return planes;
    } catch (error) {
        console.error('Error getting planes:', error);
        return { error: "Erreur lors de la récupération des avions" };
    }

};

export const removeSessionsByID = async (sessionIDs: string[]) => {
    try {
        // Récupérer les sessions avec les studentID associés
        const sessions = await prisma.flight_sessions.findMany({
            where: {
                id: { in: sessionIDs },
            },
        });
        prisma.$disconnect();


        // Récupérer les étudiants associés via leur ID
        const studentIDs = sessions
            .map((session) => session.studentID)
            .filter((id): id is string => id !== null);
        const students = await prisma.user.findMany({
            where: {
                id: { in: studentIDs },
            },
        });
        prisma.$disconnect();

        const piloteIDs = sessions.map((session) => session.pilotID).filter((id): id is string => id !== null);
        const pilotes = await prisma.user.findMany({
            where: {
                id: { in: piloteIDs },
            },
        });
        prisma.$disconnect();

        const piloteMap = new Map(pilotes.map((pilot) => [pilot.id, pilot.email]));

        // Créer une map pour accéder facilement aux étudiants par leur ID
        const studentMap = new Map(students.map((student) => [student.id, student.email]));

        // Envoyer une notification pour chaque session
        for (const session of sessions) {
            const studentEmail = studentMap.get(session.studentID || '');
            const piloteEmail = piloteMap.get(session.pilotID || '');
            const endDate = new Date(session.sessionDateStart);
            endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

            if (studentEmail) {
                sendNotificationRemoveAppointment(studentEmail, session.sessionDateStart, endDate);
                sendNotificationSudentRemoveForPilot(piloteEmail as string, session.sessionDateStart as Date, endDate as Date);
            }
        }

        // Supprimer les sessions après notification
        await prisma.flight_sessions.deleteMany({
            where: {
                id: { in: sessionIDs },
            },
        });
        prisma.$disconnect();

        return { success: "Les sessions ont été supprimées !" };
    } catch (error) {
        console.error('Error deleting flight sessions:', error);
        return { error: "Erreur lors de la suppression des sessions de vol" };
    }
};

export const removeStudentFromSessionID = async (sessionID: string) => {
    try {
        // Récupérer les informations de la session
        const session = await prisma.flight_sessions.findUnique({
            where: { id: sessionID },
        });
        prisma.$disconnect();

        if (!session || !session.sessionDateStart || !session.studentID || !session.pilotID) {
            return { error: "Session introuvable ou incomplète." };
        }

        const student = await prisma.user.findUnique({
            where: { id: session.studentID }
        })
        prisma.$disconnect();

        const pilote = await prisma.user.findUnique({
            where: { id: session.pilotID }
        })
        prisma.$disconnect();


        const sessionDateUTC = new Date(session.sessionDateStart); // Assurez-vous que cette date est UTC

        // Vérifier si la date de la session est dans le futur et à plus de 3 heures de l'heure actuelle
        const nowUTC = new Date(); // Date actuelle en UTC
        const hoursUntilSession = differenceInHours(sessionDateUTC, nowUTC);

        if (isBefore(sessionDateUTC, nowUTC) || hoursUntilSession < 3) {
            return { error: "La session ne peut être modifiée que si elle est dans plus de 3 heures." };
        }

        // Mettre à jour la session en supprimant les informations de l'élève
        await prisma.flight_sessions.update({
            where: {
                id: sessionID
            },
            data: {
                studentID: null,
                studentFirstName: null,
                studentLastName: null,
                student_type: null,
                studentPlaneID: null,
            }
        });
        prisma.$disconnect();

        const endDate = new Date(session.sessionDateStart);
        endDate.setUTCMinutes(endDate.getUTCMinutes() + session.sessionDateDuration_min);

        sendNotificationRemoveAppointment(student?.email as string, session.sessionDateStart as Date, endDate as Date);
        sendNotificationSudentRemoveForPilot(pilote?.email as string, session.sessionDateStart as Date, endDate as Date);
        return { success: "L'élève a été désinscrit de la session !" };
    } catch (error) {
        console.error('Error deleting flight session:', error);
        return { error: "Erreur lors de la suppression de la session de vol" };
    }
};

export const getSessionPlanes = async (sessionID: string) => {
    try {
        // Récupère la session pour obtenir les IDs des avions
        const session = await prisma.flight_sessions.findUnique({
            where: {
                id: sessionID
            },
        });
        prisma.$disconnect();

        // Si aucun planeID n'est trouvé, retourne un tableau vide
        if (!session?.planeID || session.planeID.length === 0) {
            return [];
        }

        // Recherche des informations sur les avions dans la table `planes` pour chaque ID dans `planeID`
        const planes = await prisma.planes.findMany({
            where: {
                id: {
                    in: session.planeID // Utilise `in` pour rechercher tous les avions correspondant aux IDs dans le tableau
                },
                operational: true // Ajoute la condition pour que seuls les avions opérationnels soient récupérés
            },
            select: {
                id: true,
                name: true
            }
        });
        prisma.$disconnect();

        return planes; // Retourne le tableau d'avions avec `id` et `name`
    } catch (error) {
        console.error('Error getting session planes:', error);
        return [];
    }
};

export const studentRegistration = async (sessionID: string, studentID: string, planeID: string) => {
    if (!sessionID || !studentID || !planeID) {
        return { error: "Une erreur est survenue (E_00x: paramètres invalides)" };
    }

    try {
        // Étape 1 : Charger les données critiques
        const [student, session, conflictingSessions] = await Promise.all([
            prisma.user.findUnique({
                where: { id: studentID },
                select: {
                    id: true,
                    role: true,
                    restricted: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    clubID: true,
                },
            }),
            prisma.flight_sessions.findUnique({
                where: { id: sessionID },
                select: {
                    id: true,
                    pilotID: true,
                    sessionDateStart: true,
                    sessionDateDuration_min: true,
                    clubID: true,
                },
            }),
            prisma.flight_sessions.findMany({
                where: {
                    OR: [
                        { studentID },
                        { studentPlaneID: planeID },
                    ],
                },
                select: {
                    studentID: true,
                    studentPlaneID: true,
                    sessionDateStart: true,
                },
            }),
        ]);

        // Vérifications critiques
        if (!student) {
            return { error: "Élève introuvable." };
        }

        if (!session || session.clubID !== student.clubID) {
            return { error: "Session introuvable ou non accessible." };
        }

        if (session.sessionDateStart < new Date()) {
            return { error: "La date de la session est passée." };
        }

        if (student.restricted) {
            return { error: "Contacter l'administrateur pour plus d'informations. (E_002: restricted)" };
        }

        const allowedRoles = ["STUDENT", "PILOT", "OWNER", "ADMIN", "INSTRUCTOR"];
        if (!allowedRoles.includes(student.role)) {
            return { error: "Vous n'avez pas les droits pour vous inscrire à une session. (E_003: User)" };
        }

        const conflictingSession = conflictingSessions.find((s) =>
            s.sessionDateStart.getTime() === session.sessionDateStart.getTime()
        );
        if (conflictingSession) {
            return { error: "Conflit détecté avec une autre session (élève ou avion)." };
        }

        // Étape 2 : Mise à jour rapide de la session
        await prisma.flight_sessions.update({
            where: { id: sessionID },
            data: {
                studentID,
                studentPlaneID: planeID,
                studentFirstName: student.firstName,
                studentLastName: student.lastName,
            },
        });

        // Retour rapide de succès
        return { success: "Étudiant inscrit avec succès à la session." };

    } catch (error) {
        console.error("Erreur lors de l'inscription de l'étudiant :", error);
        return { error: "Une erreur est survenue lors de l'inscription de l'étudiant." };
    } finally {
        // Étape 3 : Traitement différé des tâches secondaires
        process.nextTick(async () => {
            try {
                const session = await prisma.flight_sessions.findUnique({
                    where: { id: sessionID },
                    select: {
                        sessionDateStart: true,
                        sessionDateDuration_min: true,
                        pilotID: true,
                    },
                });

                const instructor = await prisma.user.findUnique({
                    where: { id: session?.pilotID },
                    select: { email: true, firstName: true, lastName: true },
                });

                const endDate = new Date(session!.sessionDateStart);
                endDate.setUTCMinutes(endDate.getUTCMinutes() + session!.sessionDateDuration_min);

                await Promise.all([
                    sendNotificationBooking(
                        instructor?.email || "",
                        instructor?.firstName || "",
                        instructor?.lastName || "",
                        session!.sessionDateStart,
                        endDate
                    ),
                    sendStudentNotificationBooking(
                        instructor?.email || "",
                        session!.sessionDateStart,
                        endDate
                    ),
                ]);
            } catch (error) {
                console.error("Erreur lors du traitement différé :", error);
                // Ici, vous pourriez utiliser un mécanisme pour informer l'utilisateur d'une erreur différée.
            }
        });
    }
};



export const getHoursByMonth = async (clubID: string) => {
    const sessions = await prisma.flight_sessions.findMany({
        where: { clubID: clubID },
        select: {
            sessionDateStart: true,
            sessionDateDuration_min: true,
            studentID: true,
            pilotID: true,
        },
    });

    await prisma.$disconnect();

    // Obtenir l'année et le mois actuels
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Janvier, 11 = Décembre

    // Filtrer les sessions valides (studentID non nul)
    const validSessions = sessions.filter(
        (session) =>
            session.sessionDateStart &&
            new Date(session.sessionDateStart) < new Date() &&  // Vérifier que la session est dans le passé
            session.studentID &&  // Vérifier que studentID est rempli
            new Date(session.sessionDateStart).getFullYear() === currentYear &&
            session.pilotID // Vérifier que instructorID est non nul
    );


    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    // Initialiser le tableau avec tous les mois de l'année jusqu'au mois courant inclus
    const hoursByMonth: { month: string; hours: number }[] = monthNames
        .slice(0, currentMonth + 1) // Inclure les mois jusqu'au mois courant
        .map((month) => ({ month, hours: 0 }));

    // Ajouter les heures des sessions valides
    validSessions.forEach((session) => {
        if (session.sessionDateStart) {
            const sessionDate = new Date(session.sessionDateStart);
            if (sessionDate.getFullYear() === currentYear && sessionDate.getMonth() <= currentMonth) {
                const monthIndex = sessionDate.getMonth(); // Mois (0 = Janvier, 11 = Décembre)
                const hours = session.sessionDateDuration_min ? session.sessionDateDuration_min / 60 : 0;

                // Ajouter les heures au mois correspondant
                hoursByMonth[monthIndex].hours += hours;
            }
        }
    });
    return hoursByMonth;
};

export const getHoursByInstructor = async (clubID: string) => {
    const currentYear = new Date().getFullYear();

    // Récupérer les sessions de vol pour l'année actuelle, avec les informations sur le pilote
    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID: clubID,
            sessionDateStart: {
                gte: new Date(`${currentYear}-01-01`), // Limiter aux sessions à partir du 1er janvier de l'année actuelle
            },
        },
        select: {
            pilotID: true, // Identifiant du pilote
            sessionDateStart: true, // Date de la session
            sessionDateDuration_min: true, // Durée de la session en minutes
            pilotFirstName: true, // Prénom du pilote
            pilotLastName: true,  // Nom du pilote
            studentID: true, // Identifiant de l'étudiant
        },
    });

    await prisma.$disconnect();

    // Filtrer les sessions valides : date dans le passé, studentID rempli, année actuelle, et instructorID non nul
    const validSessions = sessions.filter(
        (session) =>
            session.sessionDateStart &&
            new Date(session.sessionDateStart) < new Date() &&  // Vérifier que la session est dans le passé
            session.studentID &&  // Vérifier que studentID est rempli
            new Date(session.sessionDateStart).getFullYear() === currentYear &&
            session.pilotID // Vérifier que instructorID est non nul
    );

    // Regrouper les heures par instructeur
    const hoursByInstructor: { [instructorID: string]: number } = {};

    validSessions.forEach((session) => {
        const instructorID = session.pilotID!;
        const hours = session.sessionDateDuration_min ? session.sessionDateDuration_min / 60 : 0;

        if (!hoursByInstructor[instructorID]) {
            hoursByInstructor[instructorID] = 0;
        }

        hoursByInstructor[instructorID] += hours;
    });

    // Mapper les instructeurs avec leurs informations
    const result = Object.entries(hoursByInstructor).map(([instructorID, hours]) => {
        // Trouver la session du premier pilote avec cet instructorID pour récupérer son nom
        const firstSession = validSessions.find(session => session.pilotID === instructorID);
        const name = firstSession ? `${firstSession.pilotLastName.toUpperCase().slice(0, 1)}.${firstSession.pilotFirstName.toLowerCase().slice(0,3)}` : 'Inconnu';

        return {
            name,
            hours,
        };
    });

    return result;
};

export const getHoursByPlane = async (clubID: string) => {
    const currentYear = new Date().getFullYear();

    // Récupérer les sessions de vol pour l'année actuelle, avec les informations sur l'avion
    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID: clubID,
            sessionDateStart: {
                gte: new Date(`${currentYear}-01-01`), // Limiter aux sessions à partir du 1er janvier de l'année actuelle
            },
        },
        select: {
            studentPlaneID: true, // Identifiant de l'avion utilisé
            sessionDateStart: true, // Date de la session
            sessionDateDuration_min: true, // Durée de la session en minutes
            studentID: true, // Identifiant de l'étudiant
        },
    });

    await prisma.$disconnect();

    // Filtrer les sessions valides : date dans le passé, studentID rempli, année actuelle, et studentPlaneID non nul
    const validSessions = sessions.filter(
        (session) =>
            session.sessionDateStart &&
            new Date(session.sessionDateStart) < new Date() &&  // Vérifier que la session est dans le passé
            session.studentID &&  // Vérifier que studentID est rempli
            new Date(session.sessionDateStart).getFullYear() === currentYear &&
            session.studentPlaneID // Vérifier que studentPlaneID est non nul
    );

    // Regrouper les heures par avion
    const hoursByPlane: { [planeID: string]: number } = {};

    validSessions.forEach((session) => {
        const planeID = session.studentPlaneID!;
        const hours = session.sessionDateDuration_min ? session.sessionDateDuration_min / 60 : 0;

        if (!hoursByPlane[planeID]) {
            hoursByPlane[planeID] = 0;
        }

        hoursByPlane[planeID] += hours;
    });

    // Mapper les avions avec leurs informations
    const result = await Promise.all(
        Object.entries(hoursByPlane).map(async ([planeID, hours]) => {
            // Chercher le nom de l'avion dans la table "planes"
            const plane = await prisma.planes.findUnique({
                where: { id: planeID },
                select: { name: true },
            });

            // Si l'avion n'est pas trouvé, on met "Inconnu"
            const planeName = plane ? plane.name : 'Inconnu';

            return {
                aircraft: planeName,
                hours,
            };
        })
    );

    return result;
};

export const getHoursByStudent = async (clubID: string) => {
    const currentYear = new Date().getFullYear();

    // Récupérer toutes les sessions de vol pour l'année actuelle
    const sessions = await prisma.flight_sessions.findMany({
        where: {
            clubID: clubID,
            sessionDateStart: {
                gte: new Date(`${currentYear}-01-01`), // Sessions à partir du 1er janvier de l'année actuelle
            },
        },
        select: {
            studentID: true, // Identifiant de l'étudiant
            sessionDateStart: true, // Date de la session
            sessionDateDuration_min: true, // Durée de la session en minutes
        },
    });

    // Récupérer uniquement les étudiants avec le rôle "STUDENT"
    const students = await prisma.user.findMany({
        where: {
            role: "STUDENT", // Ne récupérer que les étudiants
        },
        select: {
            id: true, // Identifiant de l'étudiant
            firstName: true, // Prénom de l'étudiant
            lastName: true, // Nom de l'étudiant
        },
    });

    // Construire un mapping `id -> Nom complet` pour les étudiants
    const studentMap = students.reduce<Record<string, string>>((acc, student) => {
        acc[student.id] = `${student.lastName} ${student.firstName}`;
        return acc;
    }, {});

    // Filtrer les sessions valides : passées, avec un `studentID`, et correspondant à un étudiant ayant le rôle "STUDENT"
    const validSessions = sessions.filter(
        (session) =>
            session.sessionDateStart &&
            new Date(session.sessionDateStart) < new Date() && // La session est dans le passé
            session.studentID && // L'étudiant est renseigné
            studentMap[session.studentID] // Le `studentID` correspond à un étudiant ayant le rôle "STUDENT"
    );

    // Regrouper les heures par étudiant
    const hoursByStudent: { [studentID: string]: number } = {};

    validSessions.forEach((session) => {
        const studentID = session.studentID!;
        const hours = session.sessionDateDuration_min ? session.sessionDateDuration_min / 60 : 0;

        if (!hoursByStudent[studentID]) {
            hoursByStudent[studentID] = 0;
        }

        hoursByStudent[studentID] += hours;
    });

    // Construire le résultat final avec le nom des étudiants
    const result = Object.entries(hoursByStudent).map(([studentID, hours]) => {
        const studentName = studentMap[studentID] || "Inconnu";
        return {
            student: studentName,
            hours,
        };
    });

    await prisma.$disconnect();
    return result;
};
