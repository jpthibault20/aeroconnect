export const convertMinutesToHours = (totalMinutes: number) => {
    if (totalMinutes < 0) {
        throw new Error("Le nombre de minutes ne peut pas être négatif.");
    }

    const hours = Math.floor(totalMinutes / 60); // Calcule les heures
    const minutes = totalMinutes % 60; // Calcule les minutes restantes

    // Formate et retourne la chaîne "HH:mm"
    return `${String(hours).padStart(2, "0")}H${String(minutes).padStart(2, "0")}`;
}

// Les sessions sont stockées en UTC en utilisant l'heure « wall-clock » saisie
// (cf. setUTCHours dans api/db/sessions.ts). Tous les affichages d'heure de
// session doivent donc lire en UTC pour rester cohérents entre eux.
export const formatSessionTime = (date: Date): string => {
    const d = new Date(date);
    const h = d.getUTCHours().toString().padStart(2, "0");
    const m = d.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
};