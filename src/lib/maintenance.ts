import { MaintenanceIntervention } from "@/schemas/maintenance";

/**
 * Pure, tested computation of maintenance due dates from a `MaintenanceTask`
 * reminder. A reminder can be bounded by Hobbs hours (`intervalHours`), by a
 * duration in months (`intervalMonths`), or both: the first limit reached
 * triggers "overdue".
 *
 * Factored out of the server actions / components to be shared by code and tests
 * (see CLAUDE.md).
 */

// Minimal reminder shape needed for the due date computation (subset of
// MaintenanceTask, to stay testable without Prisma).
export interface MaintenanceTaskLike {
    intervalHours: number | null;
    intervalMonths: number | null;
    lastPerformedDate: Date | string;
    lastPerformedHobbs: number;
}

export interface MaintenanceDueStatus {
    // true as soon as one of the limits (hours or date) is exceeded.
    overdue: boolean;
    // Next due Hobbs (null if no hour limit).
    nextDueHobbs: number | null;
    // Next calendar due date (null if no month limit).
    nextDueDate: Date | null;
    // Hobbs hours left before due (negative if exceeded, null if N/A).
    hoursRemaining: number | null;
    // Days left before due (negative if exceeded, null if N/A).
    daysRemaining: number | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Adds `months` months to a date (preserving the day of the month as far as possible).
 */
export function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const targetMonth = d.getMonth() + months;
    const result = new Date(d.getTime());
    result.setMonth(targetMonth);
    return result;
}

/**
 * Due status of a reminder, from the plane's current Hobbs and the reference date.
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
 * A plane is "overdue" as soon as at least one of its reminders is exceeded.
 */
export function isPlaneOverdue(
    tasks: MaintenanceTaskLike[],
    currentHobbs: number | null,
    now: Date
): boolean {
    return tasks.some((t) => getTaskDueStatus(t, currentHobbs, now).overdue);
}

/**
 * Overdue reminders of a plane (subset of `tasks`, order kept). Used for the
 * warning shown when creating an availability (AER-43).
 */
export function getOverdueTasks<T extends MaintenanceTaskLike>(
    tasks: T[],
    currentHobbs: number | null,
    now: Date
): T[] {
    return tasks.filter((t) => getTaskDueStatus(t, currentHobbs, now).overdue);
}

/**
 * Display sort of reminders: most urgent first. Sorted on the remaining
 * "margin", in days for the calendar limit and in hours for the Hobbs limit; a
 * reminder bounded by both takes the smaller margin (the one that will trigger
 * the alert). Reminders with no computable margin (no known Hobbs, no month
 * limit) come last.
 */
export function sortTasksByUrgency<T extends MaintenanceTaskLike>(
    tasks: T[],
    currentHobbs: number | null,
    now: Date
): T[] {
    const margin = (task: T): number => {
        const due = getTaskDueStatus(task, currentHobbs, now);
        const margins = [due.hoursRemaining, due.daysRemaining].filter(
            (m): m is number => m != null
        );
        return margins.length ? Math.min(...margins) : Number.POSITIVE_INFINITY;
    };
    return [...tasks]
        .map((task) => ({ task, margin: margin(task) }))
        .sort((a, b) => a.margin - b.margin)
        .map((entry) => entry.task);
}

/**
 * Display sort of interventions: most recent first (by date, then by entry date
 * to break ties).
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
