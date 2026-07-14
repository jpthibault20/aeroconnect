import { MaintenanceIntervention } from "@/schemas/maintenance";

/**
 * Calcul (pur, testé) des échéances de maintenance à partir d'un rappel
 * `MaintenanceTask`. Un rappel peut être borné par des heures moteur
 * (`intervalHours`), par une durée en mois (`intervalMonths`), ou les deux : la
 * première échéance atteinte déclenche le « retard ».
 *
 * Factorisé hors des server actions / composants pour être partagé entre le
 * code et les tests (cf. convention CLAUDE.md).
 */

// Forme minimale d'un rappel nécessaire au calcul d'échéance (sous-ensemble de
// MaintenanceTask, pour rester testable sans Prisma).
export interface MaintenanceTaskLike {
    intervalHours: number | null;
    intervalMonths: number | null;
    lastPerformedDate: Date | string;
    lastPerformedHobbs: number;
}

export interface MaintenanceDueStatus {
    // true dès qu'une des bornes (heures ou date) est dépassée.
    overdue: boolean;
    // Prochaine échéance en heures moteur (null si pas de borne horaire).
    nextDueHobbs: number | null;
    // Prochaine échéance calendaire (null si pas de borne mensuelle).
    nextDueDate: Date | null;
    // Heures moteur restantes avant échéance (négatif si dépassé, null si N/A).
    hoursRemaining: number | null;
    // Jours restants avant échéance (négatif si dépassé, null si N/A).
    daysRemaining: number | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Ajoute `months` mois à une date (en préservant au mieux le jour du mois).
 */
export function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const targetMonth = d.getMonth() + months;
    const result = new Date(d.getTime());
    result.setMonth(targetMonth);
    return result;
}

/**
 * Statut d'échéance d'un rappel, en fonction des heures moteur courantes de la
 * machine et de la date de référence.
 */
export function getTaskDueStatus(
    task: MaintenanceTaskLike,
    currentHobbs: number | null,
    now: Date
): MaintenanceDueStatus {
    const lastDate =
        task.lastPerformedDate instanceof Date
            ? task.lastPerformedDate
            : new Date(task.lastPerformedDate);

    let nextDueHobbs: number | null = null;
    let hoursRemaining: number | null = null;
    let hoursOverdue = false;
    if (task.intervalHours != null) {
        nextDueHobbs = task.lastPerformedHobbs + task.intervalHours;
        if (currentHobbs != null) {
            hoursRemaining = nextDueHobbs - currentHobbs;
            hoursOverdue = currentHobbs >= nextDueHobbs;
        }
    }

    let nextDueDate: Date | null = null;
    let daysRemaining: number | null = null;
    let dateOverdue = false;
    if (task.intervalMonths != null) {
        nextDueDate = addMonths(lastDate, task.intervalMonths);
        daysRemaining = Math.ceil((nextDueDate.getTime() - now.getTime()) / MS_PER_DAY);
        dateOverdue = now.getTime() >= nextDueDate.getTime();
    }

    return {
        overdue: hoursOverdue || dateOverdue,
        nextDueHobbs,
        nextDueDate,
        hoursRemaining,
        daysRemaining,
    };
}

/**
 * Une machine est « en retard » dès qu'au moins un de ses rappels est dépassé.
 */
export function isPlaneOverdue(
    tasks: MaintenanceTaskLike[],
    currentHobbs: number | null,
    now: Date
): boolean {
    return tasks.some((t) => getTaskDueStatus(t, currentHobbs, now).overdue);
}

/**
 * Tri d'affichage des interventions : les plus récentes d'abord (par date, puis
 * par date de saisie pour départager).
 */
export function sortInterventionsDesc(
    interventions: MaintenanceIntervention[]
): MaintenanceIntervention[] {
    return [...interventions].sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
