"use client"
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { flight_logs } from '@prisma/client';
import { computeFlightTimes, formatNature } from '@/lib/logbookCalc';

// Une section = le carnet de route d'UNE machine (registration + logs).
export interface AircraftLogbookSection {
    planeRegistration: string;
    planeName: string;
    logs: flight_logs[];
}

interface Props {
    // Une ou plusieurs machines (export « Tous les aéronefs » = plusieurs sections).
    sections: AircraftLogbookSection[];
    year: number;
}

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
    machineRow: {
        flexDirection: "row",
        backgroundColor: "#eef2ff",
        borderBottomWidth: 0.5,
        borderTopWidth: 0.5,
        borderColor: "#cbd5e1",
        minHeight: 16,
        alignItems: "center",
    },
    machineLabel: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        fontSize: 7.5,
        fontWeight: "bold",
        textAlign: "left",
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
    { label: "Nature", width: "10%" },
    { label: "Hobbs déb.", width: "7%" },
    { label: "Hobbs fin", width: "7%" },
    { label: "Att.", width: "4%" },
    { label: "Carburant", width: "7%" },
    { label: "Anomalie machine", width: "19%" },
    { label: "Signé", width: "4%" },
];

// Nombre de lignes tenant sur une page A4 paysage (en-tête de tableau + pied
// de page compris). Volontairement conservateur : au-delà, @react-pdf coupe
// lui-même la page et produit une page orpheline d'une ou deux lignes.
const ROWS_PER_PAGE = 29;

// Une ligne du flux : séparateur de machine, vol, ou total de machine.
type LogbookRow =
    | { kind: "machine"; registration: string; name: string; continued: boolean }
    | { kind: "log"; log: flight_logs }
    | { kind: "total"; minutes: number; landings: number; fuel: number };

// Aplatit toutes les sections en un seul flux de lignes : les machines se
// suivent sur la même page, on ne repart en page neuve que lorsqu'elle est
// pleine (et non à chaque changement de machine).
const buildRows = (sections: AircraftLogbookSection[], withMachineHeaders: boolean): LogbookRow[] => {
    const rows: LogbookRow[] = [];

    for (const section of sections) {
        // Ordre historique : du vol le plus ancien (en haut) au plus récent (en bas).
        const logs = [...section.logs].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        if (withMachineHeaders) {
            rows.push({
                kind: "machine",
                registration: section.planeRegistration,
                name: section.planeName,
                continued: false,
            });
        }

        for (const log of logs) rows.push({ kind: "log", log });

        rows.push({
            kind: "total",
            minutes: logs.reduce((acc, l) => acc + computeFlightTimes(l).durationMinutes, 0),
            landings: logs.reduce((acc, l) => acc + l.landings, 0),
            fuel: logs.reduce((acc, l) => acc + (l.fuelAdded ?? 0), 0),
        });
    }

    return rows;
};

// Découpe le flux en pages pleines. Quand une machine déborde sur la page
// suivante, on réinsère son intitulé suivi de « (suite) ».
const paginate = (rows: LogbookRow[]): LogbookRow[][] => {
    const pages: LogbookRow[][] = [];
    let current: LogbookRow[] = [];
    let currentMachine: { registration: string; name: string } | null = null;

    for (const row of rows) {
        // Évite un intitulé de machine seul en bas de page.
        const wouldOrphanHeader = row.kind === "machine" && current.length >= ROWS_PER_PAGE - 2;

        if (current.length >= ROWS_PER_PAGE || (wouldOrphanHeader && current.length > 0)) {
            pages.push(current);
            current = [];
            if (row.kind !== "machine" && currentMachine) {
                current.push({ kind: "machine", ...currentMachine, continued: true });
            }
        }

        if (row.kind === "machine") {
            currentMachine = { registration: row.registration, name: row.name };
        }
        current.push(row);
    }

    if (current.length > 0) pages.push(current);
    if (pages.length === 0) pages.push([]);
    return pages;
};

export const AircraftLogbookDocument = ({ sections, year }: Props) => {
    // Au moins une section pour toujours produire un PDF valide (non vide).
    const safeSections = sections.length > 0
        ? sections
        : [{ planeRegistration: "", planeName: "", logs: [] }];

    // Une seule machine : elle est déjà nommée dans le sous-titre, pas besoin
    // de séparateur dans le tableau.
    const multiMachine = safeSections.length > 1;
    const pages = paginate(buildRows(safeSections, multiMachine));

    const subtitleTarget = multiMachine
        ? "Tous les aéronefs"
        : `${safeSections[0].planeRegistration} (${safeSections[0].planeName})`;

    return (
        <Document>
            {pages.map((pageRows, pageIdx) => (
                <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
                    <Text style={styles.title}>CARNET DE VOL MACHINE</Text>
                    <Text style={styles.subtitle}>
                        {subtitleTarget} — {year} — Page {pageIdx + 1}/{pages.length}
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
                        {pageRows.map((row, rowIdx) => {
                            if (row.kind === "machine") {
                                return (
                                    <View key={`m-${pageIdx}-${rowIdx}`} style={styles.machineRow}>
                                        <Text style={[styles.machineLabel, { width: "100%" }]}>
                                            {row.registration}{row.name ? ` — ${row.name}` : ""}{row.continued ? " (suite)" : ""}
                                        </Text>
                                    </View>
                                );
                            }

                            if (row.kind === "total") {
                                return (
                                    <View key={`t-${pageIdx}-${rowIdx}`} style={styles.totalRow}>
                                        <Text style={[styles.cell, { width: "14%" }]}>TOTAL</Text>
                                        <Text style={[styles.cell, { width: "6%" }]}></Text>
                                        <Text style={[styles.cell, { width: "8%" }]}></Text>
                                        <Text style={[styles.cell, { width: "8%" }]}></Text>
                                        <Text style={[styles.cell, { width: "6%", fontWeight: "bold" }]}>{formatMin(row.minutes)}</Text>
                                        <Text style={[styles.cell, { width: "10%" }]}></Text>
                                        <Text style={[styles.cell, { width: "7%" }]}></Text>
                                        <Text style={[styles.cell, { width: "7%" }]}></Text>
                                        <Text style={[styles.cell, { width: "4%" }]}>{row.landings}</Text>
                                        <Text style={[styles.cell, { width: "7%" }]}>{row.fuel > 0 ? `${row.fuel}L` : ""}</Text>
                                        <Text style={[styles.cell, { width: "19%" }]}></Text>
                                        <Text style={[styles.cell, { width: "4%" }]}></Text>
                                    </View>
                                );
                            }

                            const log = row.log;
                            const t = computeFlightTimes(log);
                            return (
                                <View key={log.id} style={styles.row}>
                                    <Text style={[styles.cell, { width: "14%", fontSize: 6, textAlign: "left" }]}>
                                        {log.pilotLastName} {(log.pilotFirstName ?? "").slice(0, 1)}.
                                    </Text>
                                    <Text style={[styles.cell, { width: "6%" }]}>{formatDate(log.date)}</Text>
                                    <Text style={[styles.cell, { width: "8%" }]}>{log.departureAirfield ?? ""}</Text>
                                    <Text style={[styles.cell, { width: "8%" }]}>{log.arrivalAirfield ?? ""}</Text>
                                    <Text style={[styles.cell, { width: "6%" }]}>{t.durationMinutes > 0 ? formatMin(t.durationMinutes) : ""}</Text>
                                    <Text style={[styles.cell, { width: "10%", fontSize: 6 }]}>{formatNature(log.flightNature, log.instructionSubType)}</Text>
                                    <Text style={[styles.cell, { width: "7%" }]}>{log.hobbsStart != null ? log.hobbsStart.toFixed(1) : ""}</Text>
                                    <Text style={[styles.cell, { width: "7%" }]}>{log.hobbsEnd != null ? log.hobbsEnd.toFixed(1) : ""}</Text>
                                    <Text style={[styles.cell, { width: "4%" }]}>{log.landings}</Text>
                                    <Text style={[styles.cell, { width: "7%" }]}>{log.fuelAdded != null ? `${log.fuelAdded}L` : ""}</Text>
                                    <Text style={[styles.cell, { width: "19%", fontSize: 5.5, textAlign: "left" }]}>{log.machineAnomalies ?? "RAS"}</Text>
                                    <Text style={[styles.cell, { width: "4%" }]}>{log.pilotSigned ? "✓" : ""}</Text>
                                </View>
                            );
                        })}
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
