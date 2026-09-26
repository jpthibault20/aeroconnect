/**
 * "Real instant" → "club clock time" conversion.
 *
 * Slots are stored as *UTC wall-clock*: a session entered at 14:00 is written
 * `T14:00:00.000Z`, whatever the season (see setUTCHours in api/db/sessions.ts,
 * and the UTC read convention of dateServeur.ts).
 *
 * Consequence: comparing a slot to `new Date()` is WRONG. In France in summer
 * (UTC+2), at a real 16:00 the current instant is 14:00Z, so a 15:00 slot that
 * started an hour ago still looks "upcoming". The gap equals the time zone
 * offset, i.e. up to 2 hours during which a past slot stays bookable.
 *
 * `toClubWallClock` brings the current instant into the same reference as the
 * slots: they can then be compared directly.
 */

// Clubs' reference time zone. The app is French-speaking and single time zone;
// when a club outside mainland France arrives, this will have to become a `Club`
// column passed as a parameter (the function below already accepts it).
export const CLUB_TIME_ZONE = "Europe/Paris";

/**
 * Returns the instant whose UTC parts equal the clock time of `timeZone` at
 * `instant`. In other words: the same value a slot created "now" in the club
 * would have.
 */
export function toClubWallClock(instant: Date, timeZone: string = CLUB_TIME_ZONE): Date {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        // h23 (not hour12: false): some engines render "24" for midnight with
        // hour12: false, which would shift by a day.
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(instant);

    const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);

    return new Date(
        Date.UTC(
            part("year"),
            part("month") - 1,
            part("day"),
            part("hour"),
            part("minute"),
            part("second")
        )
    );
}

/**
 * REAL instant (to compare with a timestamptz `createdAt`) at which the current
 * month or year starts, in club time.
 *
 * `new Date(year, month, 1)` would use the SERVER time zone (UTC on Vercel): the
 * month would start at 01:00 or 02:00 Paris time, and an operation made on the
 * 1st between midnight and 2 am would land in the previous month. The offset is
 * recomputed at the target date: March 1 and late March differ (daylight saving),
 * same for October.
 */
export function clubPeriodStart(
    instant: Date,
    period: "month" | "year",
    timeZone: string = CLUB_TIME_ZONE
): Date {
    const wall = toClubWallClock(instant, timeZone);
    const startWall = Date.UTC(wall.getUTCFullYear(), period === "month" ? wall.getUTCMonth() : 0, 1);
    // Time zone offset (ms) at a given instant: clock time - real instant.
    const offsetAt = (t: number) => toClubWallClock(new Date(t), timeZone).getTime() - t;
    const guess = startWall - offsetAt(instant.getTime());
    return new Date(startWall - offsetAt(guess));
}
