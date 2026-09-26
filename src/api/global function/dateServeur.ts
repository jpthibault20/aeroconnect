export const convertMinutesToHours = (totalMinutes: number) => {
    if (totalMinutes < 0) {
        throw new Error("Le nombre de minutes ne peut pas être négatif.");
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}H${String(minutes).padStart(2, "0")}`;
}

// Sessions are stored in UTC using the wall-clock hour entered (see setUTCHours
// in api/db/sessions.ts). Every session time display must therefore read in UTC
// to stay consistent.
export const formatSessionTime = (date: Date | string): string => {
    const d = new Date(date);
    const h = d.getUTCHours().toString().padStart(2, "0");
    const m = d.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
};

// Date counterpart of formatSessionTime: same UTC convention. Without
// `timeZone: "UTC"`, toLocaleDateString applies the browser time zone and shifts
// the display (+2 h in France in summer), even changing day for a late slot.
export const formatSessionDate = (
    date: Date | string,
    options: Intl.DateTimeFormatOptions = { weekday: "long", day: "2-digit", month: "long" }
): string => new Date(date).toLocaleDateString("fr-FR", { ...options, timeZone: "UTC" });