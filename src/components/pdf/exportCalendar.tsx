import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { flight_sessions, planes } from '@prisma/client';

interface Props {
    ID: string;
    flightsSessions: flight_sessions[];
    planes: planes[];
    startDate: Date;
    endDate: Date;
    clubHours: number[];
}

const isSameDay = (d1: Date, d2: Date): boolean =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const getPlaneName = (planeID: string, planes: planes[]) => {
    if (planeID === 'classroomSession') return 'Session salle';
    if (planeID === 'noPlane') return 'Aucun avion';
    const plane = planes.find((p) => p.id === planeID);
    return plane ? plane.name : 'Avion inconnu';
};

const getWeeksBetween = (startInput: Date, endInput: Date): Date[][] => {
    // Créer des copies des dates d'entrée pour éviter toute modification des originaux
    const start = new Date(startInput.getTime());
    const end = new Date(endInput.getTime());
    
    // S'assurer que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Dates invalides fournies à getWeeksBetween', { startInput, endInput });
        return []; // Retourner un tableau vide en cas de dates invalides
    }
    
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // Réinitialiser l'heure pour éviter les problèmes de comparaison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // Créer une nouvelle date pour itération
    const current = new Date(start.getTime());
    
    // Boucle de sécurité pour éviter une boucle infinie (maximum 100 semaines)
    let safetyCounter = 0;
    const MAX_WEEKS = 100;
    
    while (current <= end && safetyCounter < MAX_WEEKS) {
        currentWeek.push(new Date(current.getTime()));
        
        // Si c'est dimanche ou le dernier jour, on termine la semaine
        if (current.getDay() === 0 || current.getTime() === end.getTime()) {
            weeks.push([...currentWeek]);
            currentWeek = [];
        }
        
        // Passer au jour suivant
        current.setDate(current.getDate() + 1);
        safetyCounter++;
    }
    
    // Ajouter la dernière semaine si elle n'est pas vide et n'a pas déjà été ajoutée
    if (currentWeek.length > 0) {
        weeks.push([...currentWeek]);
    }
    
    return weeks;
};

// Formater la date en français pour le titre
const formatWeekTitle = (startDate: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    const endOfWeek = new Date(startDate);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startStr = startDate.toLocaleDateString('fr-FR', options);
    const endStr = endOfWeek.toLocaleDateString('fr-FR', options);

    return `Planning – Semaine du ${startStr} au ${endStr}`;
};

export const MyDocument = ({ ID, flightsSessions, planes, startDate, endDate, clubHours }: Props) => {

    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    // Vérifier que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Dates invalides fournies au composant MyDocument', { startDate, endDate });
        return <Document><Page size="A4"><Text>Erreur: dates invalides</Text></Page></Document>;
    }
try{
    const weeks = getWeeksBetween(start, end);
    const filteredSessions = flightsSessions.filter((s) => ID === 'all' || s.pilotID === ID);

    return (
        <Document>
            {weeks.map((week, index) => (
                <Page key={index} size="A4" orientation="landscape" style={styles.page}>
                    <Text style={styles.header}>{formatWeekTitle(week[0])}</Text>
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.hourCell}>Heure</Text>
                            {week.map((day) => (
                                <Text key={day.toISOString()} style={styles.tableCell}>
                                    {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </Text>
                            ))}
                        </View>
                        {clubHours.map((hour) => (
                            <View key={hour} style={styles.tableRow}>
                                <Text style={styles.hourCell}>{hour}:00</Text>
                                {week.map((day) => {
                                    const session = filteredSessions.find(
                                        (s) =>
                                            isSameDay(new Date(s.sessionDateStart), day) &&
                                            new Date(s.sessionDateStart).getHours() === hour
                                    );
                                    if (session?.studentID) {
                                        return (
                                            <View key={day.toISOString()} style={styles.tableCell}>
                                                <Text>
                                                    {session ? `${session.studentFirstName} ${session.studentLastName?.toUpperCase()}` : ''}
                                                </Text>
                                                <Text>
                                                    {`(${getPlaneName(session.studentPlaneID as string, planes)})`}
                                                </Text>
                                            </View>
                                        );
                                    }
                                    return (
                                        <Text key={day.toISOString()} style={styles.tableCell} />
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                    <Text style={styles.footer}>
                        Attention : ce planning papier peut ne pas représenter la réalité.
                        Pour consulter les dernières mises à jour, veuillez vous rendre sur https://app.aeroconnect.fr/
                    </Text>
                </Page>
            ))}
        </Document>
    );
} catch (error) {
    console.error('Erreur lors de la génération du document', error);
    return <Document><Page size="A4"><Text>Erreur lors de la génération: {String(error)}</Text></Page></Document>;
}
};

// Styles PDF - optimisé pour format paysage
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#fff',
        padding: 20,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 15,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableContainer: {
        width: '100%',
        flexDirection: 'column',
        border: '1px solid #000',
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#E4E4E4',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        minHeight: 25,
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#ccc',
        fontSize: 9,
    },
    hourCell: {
        flex: 0.5,
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#f0f0f0',
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: '#ccc',
    },
    footer: {
        fontSize: 8,
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    link: {
        color: 'blue',
        textDecoration: 'underline',
    }
});