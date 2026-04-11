"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { flight_logs } from '@prisma/client';

interface Props {
    logs: flight_logs[];
    planeRegistration: string;
    planeName: string;
    year: number;
}

const NATURE_LABELS: Record<string, string> = {
    INSTRUCTION: "Instr.",
    LOCAL: "Local",
    NAVIGATION: "Nav.",
    VLO: "VLO",
    VLD: "VLD",
    EXAM: "Exam.",
    FIRST_FLIGHT: "1er vol",
    BAPTEME: "Bapt.",
    OTHER: "Autre",
};

const formatMin = (min: number): string => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
};

const formatDate = (date: Date): string => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 7,
        fontFamily: "Helvetica",
    },
    title: {
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 8,
        textAlign: "center",
        marginBottom: 10,
        color: "#64748b",
    },
    table: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f1f5f9",
        borderBottomWidth: 1,
        borderColor: "#cbd5e1",
        minHeight: 22,
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderColor: "#e2e8f0",
        minHeight: 16,
        alignItems: "center",
    },
    totalRow: {
        flexDirection: "row",
        backgroundColor: "#f8fafc",
        borderTopWidth: 1,
        borderColor: "#cbd5e1",
        minHeight: 18,
        alignItems: "center",
        fontWeight: "bold",
    },
    cell: {
        paddingHorizontal: 2,
        paddingVertical: 2,
        textAlign: "center",
    },
    footer: {
        position: "absolute",
        bottom: 15,
        left: 20,
        right: 20,
        fontSize: 6,
        color: "#94a3b8",
        flexDirection: "row",
        justifyContent: "space-between",
    },
});

// Colonnes carnet de route (Art. 5.3.3)
const columns = [
    { label: "Pilote", width: "14%" },
    { label: "Date", width: "6%" },
    { label: "Départ", width: "8%" },
    { label: "Arrivée", width: "8%" },
    { label: "Temps", width: "6%" },
    { label: "Nature", width: "6%" },
    { label: "Hobbs déb.", width: "7%" },
    { label: "Hobbs fin", width: "7%" },
    { label: "Att.", width: "4%" },
    { label: "Carburant", width: "7%" },
    { label: "Huile", width: "5%" },
    { label: "Anomalies / RAS", width: "18%" },
    { label: "Signé", width: "4%" },
];

const ROWS_PER_PAGE = 32;

export const AircraftLogbookDocument = ({ logs, planeRegistration, planeName, year }: Props) => {
    const pages: flight_logs[][] = [];
    for (let i = 0; i < logs.length; i += ROWS_PER_PAGE) {
        pages.push(logs.slice(i, i + ROWS_PER_PAGE));
    }

    if (pages.length === 0) {
        pages.push([]);
    }

    const totalMinutes = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const totalLandings = logs.reduce((acc, l) => acc + l.landings, 0);

    return (
        <Document>
            {pages.map((pageLogs, pageIdx) => (
                <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
                    <Text style={styles.title}>CARNET DE ROUTE</Text>
                    <Text style={styles.subtitle}>
                        {planeRegistration} ({planeName}) — {year} — Page {pageIdx + 1}/{pages.length}
                    </Text>

                    <View style={styles.table}>
                        {/* Header */}
                        <View style={styles.headerRow}>
                            {columns.map((col) => (
                                <Text key={col.label} style={[styles.cell, { width: col.width, fontWeight: "bold", fontSize: 6.5 }]}>
                                    {col.label}
                                </Text>
                            ))}
                        </View>

                        {/* Rows */}
                        {pageLogs.map((log) => (
                            <View key={log.id} style={styles.row}>
                                <Text style={[styles.cell, { width: "14%", fontSize: 6, textAlign: "left" }]}>
                                    {log.pilotLastName} {(log.pilotFirstName ?? "").slice(0, 1)}.
                                </Text>
                                <Text style={[styles.cell, { width: "6%" }]}>{formatDate(log.date)}</Text>
                                <Text style={[styles.cell, { width: "8%" }]}>{log.departureAirfield ?? ""}</Text>
                                <Text style={[styles.cell, { width: "8%" }]}>{log.arrivalAirfield ?? ""}</Text>
                                <Text style={[styles.cell, { width: "6%" }]}>{formatMin(log.durationMinutes)}</Text>
                                <Text style={[styles.cell, { width: "6%" }]}>{NATURE_LABELS[log.flightNature] ?? ""}</Text>
                                <Text style={[styles.cell, { width: "7%" }]}>{log.hobbsStart != null ? log.hobbsStart.toFixed(1) : ""}</Text>
                                <Text style={[styles.cell, { width: "7%" }]}>{log.hobbsEnd != null ? log.hobbsEnd.toFixed(1) : ""}</Text>
                                <Text style={[styles.cell, { width: "4%" }]}>{log.landings}</Text>
                                <Text style={[styles.cell, { width: "7%" }]}>{log.fuelAdded != null ? `${log.fuelAdded}L` : ""}</Text>
                                <Text style={[styles.cell, { width: "5%" }]}>{log.oilAdded != null ? `${log.oilAdded}L` : ""}</Text>
                                <Text style={[styles.cell, { width: "18%", fontSize: 5.5, textAlign: "left" }]}>{log.anomalies ?? "RAS"}</Text>
                                <Text style={[styles.cell, { width: "4%" }]}>{log.pilotSigned ? "✓" : ""}</Text>
                            </View>
                        ))}

                        {/* Totals on last page */}
                        {pageIdx === pages.length - 1 && (
                            <View style={styles.totalRow}>
                                <Text style={[styles.cell, { width: "14%" }]}>TOTAL</Text>
                                <Text style={[styles.cell, { width: "6%" }]}></Text>
                                <Text style={[styles.cell, { width: "8%" }]}></Text>
                                <Text style={[styles.cell, { width: "8%" }]}></Text>
                                <Text style={[styles.cell, { width: "6%", fontWeight: "bold" }]}>{formatMin(totalMinutes)}</Text>
                                <Text style={[styles.cell, { width: "6%" }]}></Text>
                                <Text style={[styles.cell, { width: "7%" }]}></Text>
                                <Text style={[styles.cell, { width: "7%" }]}></Text>
                                <Text style={[styles.cell, { width: "4%" }]}>{totalLandings}</Text>
                                <Text style={[styles.cell, { width: "7%" }]}></Text>
                                <Text style={[styles.cell, { width: "5%" }]}></Text>
                                <Text style={[styles.cell, { width: "18%" }]}></Text>
                                <Text style={[styles.cell, { width: "4%" }]}></Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <Text>Généré par AeroConnect — {new Date().toLocaleDateString("fr-FR")}</Text>
                        <Text>Arrêté du 17 février 2025 — Art. 5.3.3</Text>
                    </View>
                </Page>
            ))}
        </Document>
    );
};
