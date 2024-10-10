interface DayInfo {
    dayName: string;   
    dayNumber: number; 
    isToday: boolean;  
}

export const getDaysOfWeek = (inputDate: Date): DayInfo[] => {
    const date = new Date(inputDate);
    const currentDate = new Date(); 
    const daysOfWeek: DayInfo[] = [];

    // Trouver le premier jour de la semaine (lundi)
    const dayOfWeek = (date.getDay() + 6) % 7; // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    date.setDate(date.getDate() - dayOfWeek); // Reculer jusqu'au lundi

    // Parcourir les 7 jours de la semaine
    for (let i = 0; i < 7; i++) {
        const day = new Date(date);
        const dayInfo: DayInfo = {
            dayName: day.toLocaleString('default', { weekday: 'long' }), // Nom du jour
            dayNumber: day.getDate(), // Numéro du jour
            isToday: day.toDateString() === currentDate.toDateString(), // Comparaison pour savoir si c'est aujourd'hui
        };
        daysOfWeek.push(dayInfo);
        date.setDate(date.getDate() + 1); // Passer au jour suivant
    }

    return daysOfWeek;
};