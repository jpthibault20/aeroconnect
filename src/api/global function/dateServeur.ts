export const convertMinutesToHours = (totalMinutes: number) => {
    if (totalMinutes < 0) {
        throw new Error("Le nombre de minutes ne peut pas être négatif.");
    }

    const hours = Math.floor(totalMinutes / 60); // Calcule les heures
    const minutes = totalMinutes % 60; // Calcule les minutes restantes

    // Formate et retourne la chaîne "HH:mm"
    return `${String(hours).padStart(2, "0")}H${String(minutes).padStart(2, "0")}`;
}