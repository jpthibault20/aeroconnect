"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { flight_sessions, planes } from '@prisma/client';

interface Props {
    // Modification: accepte un tableau d'IDs d'instructeurs au lieu d'un seul
    instructorIDs: string[];
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
    // Vérifier que les dates sont valides avant de procéder
    if (isNaN(startInput.getTime()) || isNaN(endInput.getTime())) {
        console.error('Dates invalides fournies à getWeeksBetween', { startInput, endInput });
        return []; // Retourner un tableau vide en cas de dates invalides
    }

    // Créer des copies immutables des dates d'entrée
    const start = new Date(startInput.getFullYear(), startInput.getMonth(), startInput.getDate());
    const end = new Date(endInput.getFullYear(), endInput.getMonth(), endInput.getDate(), 23, 59, 59);

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Créer une nouvelle date pour itération, sans modifier l'original
    let current = new Date(start);

    // Boucle de sécurité pour éviter une boucle infinie
    let safetyCounter = 0;
    const MAX_WEEKS = 100;

    while (current.getTime() <= end.getTime() && safetyCounter < MAX_WEEKS) {
        // Créer une nouvelle instance pour chaque jour
        currentWeek.push(new Date(current));

        // Si c'est dimanche ou le dernier jour, on termine la semaine
        if (current.getDay() === 0 || current.getTime() === end.getTime()) {
            weeks.push([...currentWeek]);
            currentWeek = [];
        }

        // Créer une nouvelle date pour le jour suivant plutôt que modifier l'existante
        const nextDay = new Date(current);
        nextDay.setDate(nextDay.getDate() + 1);
        current = nextDay;

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

export const MyDocument = ({ instructorIDs, flightsSessions, planes, startDate, endDate, clubHours }: Props) => {
    // S'assurer que les dates sont des objets Date
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    // Vérifier que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Dates invalides fournies au composant MyDocument', { startDate, endDate });
        return <Document><Page size="A4"><Text>Erreur: dates invalides</Text></Page></Document>;
    }

    const weeks = getWeeksBetween(start, end);

    // Filtrer les sessions pour n'inclure que celles des instructeurs spécifiés et avec un étudiant
    const filteredSessions = flightsSessions.filter((s) =>
        (instructorIDs.includes('all') || instructorIDs.includes(s.pilotID)) &&
        s.studentID // Vérifier qu'il y a un étudiant inscrit
    );

    return (
        <Document>
            {weeks.map((week, index) => (
                <Page key={index} size="A4" orientation="landscape" style={styles.page}>
                    <Text style={styles.header}>{formatWeekTitle(week[0])}</Text>
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.hourCell}>Heure</Text>
                            {week.map((day, index) => (
                                <Text key={index} style={styles.tableCell}>
                                    {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </Text>
                            ))}
                        </View>
                        {clubHours.map((hour) => (
                            <View key={hour} style={styles.tableRow}>
                                <Text style={styles.hourCell}>{hour}:00</Text>
                                {week.map((day, index) => {
                                    // Trouver toutes les sessions pour ce jour et cette heure
                                    const sessions = filteredSessions.filter(
                                        (s) =>
                                            isSameDay(new Date(s.sessionDateStart), day) &&
                                            new Date(s.sessionDateStart).getHours() === hour
                                    );

                                    // S'il y a des sessions, les afficher toutes
                                    if (sessions.length > 0) {
                                        return (
                                            <View key={index} style={styles.tableCell}>
                                                {sessions.map((session, sessionIndex) => (
                                                    <View key={`${session.id}-${sessionIndex}`} style={sessionIndex > 0 ? styles.sessionDivider : {}}>
                                                        <Text style={styles.studentName}>
                                                            {session.studentFirstName} {session.studentLastName?.toUpperCase()}
                                                        </Text>
                                                        <Text style={styles.instructorName}>
                                                            {`Inst: ${session.pilotFirstName}`}
                                                        </Text>
                                                        <Text style={styles.planeName}>
                                                            {`(${getPlaneName(session.studentPlaneID as string, planes)})`}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        );
                                    }

                                    // Sinon, retourner une cellule vide
                                    return (
                                        <View key={index} style={styles.tableCell} />
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                    <View style={styles.footer}>
                        <Text>
                            Attention : ce planning papier peut ne pas représenter la réalité.
                            Pour consulter les dernières mises à jour, veuillez vous rendre sur https://app.aeroconnect.fr/
                        </Text>
                    </View>
                </Page>
            ))}
        </Document>
    );
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
        minHeight: 15,
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
        padding: 2,
        borderRightWidth: 1,
        borderRightColor: '#ccc',
        fontSize: 9,
    },
    hourCell: {
        flex: 0.5,
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#f0f0f0',
        padding: 2,
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
    },
    sessionDivider: {
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    studentName: {
        fontSize: 8,
        fontWeight: 'bold',
    },
    instructorName: {
        fontSize: 7,
    },
    planeName: {
        fontSize: 7,
        fontStyle: 'italic',
    }
});