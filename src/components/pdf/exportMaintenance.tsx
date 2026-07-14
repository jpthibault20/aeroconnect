"use client";
import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { MaintenanceTask } from "@prisma/client";
import { MaintenanceIntervention } from "@/schemas/maintenance";
import { getTaskDueStatus } from "@/lib/maintenance";

interface Props {
    planeName: string;
    planeRegistration: string;
    hobbsTotal: number | null;
    interventions: MaintenanceIntervention[];
    tasks: MaintenanceTask[];
    // Date de génération (passée en prop pour rester déterministe / testable).
    generatedAt: Date;
}

const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const styles = StyleSheet.create({
    page: { padding: 24, fontSize: 8, fontFamily: "Helvetica" },
    title: { fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 2 },
    subtitle: { fontSize: 9, textAlign: "center", marginBottom: 4, color: "#64748b" },
    meta: { fontSize: 8, textAlign: "center", marginBottom: 14, color: "#94a3b8" },
    sectionTitle: {
        fontSize: 10,
        fontWeight: "bold",
        marginTop: 12,
        marginBottom: 6,
        color: "#334155",
    },
    table: { width: "100%", borderWidth: 1, borderColor: "#cbd5e1" },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f1f5f9",
        borderBottomWidth: 1,
        borderColor: "#cbd5e1",
        minHeight: 20,
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderColor: "#e2e8f0",
        minHeight: 18,
        alignItems: "center",
    },
    cell: { paddingHorizontal: 4, paddingVertical: 3, textAlign: "left" },
    empty: { fontSize: 8, color: "#94a3b8", marginTop: 4 },
    footer: {
        position: "absolute",
        bottom: 15,
        left: 24,
        right: 24,
        fontSize: 6,
        color: "#94a3b8",
        flexDirection: "row",
        justifyContent: "space-between",
    },
});

// Colonnes de l'historique des interventions.
const interventionCols = [
    { label: "Date", width: "12%" },
    { label: "Type", width: "16%" },
    { label: "Description", width: "34%" },
    { label: "H. moteur", width: "10%" },
    { label: "Commentaire", width: "18%" },
    { label: "Saisi par", width: "10%" },
];

// Colonnes des rappels.
const taskCols = [
    { label: "Intitulé", width: "30%" },
    { label: "Périodicité", width: "22%" },
    { label: "Dernière réalisation", width: "20%" },
    { label: "Prochaine échéance", width: "20%" },
    { label: "État", width: "8%" },
];

const describeInterval = (task: MaintenanceTask): string => {
    const parts: string[] = [];
    if (task.intervalHours != null) parts.push(`${task.intervalHours} h`);
    if (task.intervalMonths != null) parts.push(`${task.intervalMonths} mois`);
    return parts.join(" / ") || "—";
};

export const MaintenanceDocument = ({
    planeName,
    planeRegistration,
    hobbsTotal,
    interventions,
    tasks,
    generatedAt,
}: Props) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>SUIVI DE MAINTENANCE</Text>
                <Text style={styles.subtitle}>
                    {planeName} — {planeRegistration}
                </Text>
                <Text style={styles.meta}>
                    Heures moteur actuelles : {hobbsTotal != null ? `${hobbsTotal.toFixed(1)} h` : "—"}
                </Text>

                {/* Rappels */}
                <Text style={styles.sectionTitle}>Rappels d&apos;entretien</Text>
                {tasks.length === 0 ? (
                    <Text style={styles.empty}>Aucun rappel configuré.</Text>
                ) : (
                    <View style={styles.table}>
                        <View style={styles.headerRow}>
                            {taskCols.map((c) => (
                                <Text key={c.label} style={[styles.cell, { width: c.width, fontWeight: "bold" }]}>
                                    {c.label}
                                </Text>
                            ))}
                        </View>
                        {tasks.map((task) => {
                            const due = getTaskDueStatus(task, hobbsTotal, generatedAt);
                            const nextParts: string[] = [];
                            if (due.nextDueHobbs != null) nextParts.push(`${due.nextDueHobbs.toFixed(1)} h`);
                            if (due.nextDueDate != null) nextParts.push(formatDate(due.nextDueDate));
                            return (
                                <View key={task.id} style={styles.row}>
                                    <Text style={[styles.cell, { width: "30%" }]}>{task.title}</Text>
                                    <Text style={[styles.cell, { width: "22%" }]}>{describeInterval(task)}</Text>
                                    <Text style={[styles.cell, { width: "20%" }]}>
                                        {formatDate(task.lastPerformedDate)} — {task.lastPerformedHobbs.toFixed(1)} h
                                    </Text>
                                    <Text style={[styles.cell, { width: "20%" }]}>{nextParts.join(" / ") || "—"}</Text>
                                    <Text
                                        style={[
                                            styles.cell,
                                            { width: "8%", color: due.overdue ? "#dc2626" : "#16a34a", fontWeight: "bold" },
                                        ]}
                                    >
                                        {due.overdue ? "Retard" : "OK"}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Historique */}
                <Text style={styles.sectionTitle}>Historique des interventions</Text>
                {interventions.length === 0 ? (
                    <Text style={styles.empty}>Aucune intervention enregistrée.</Text>
                ) : (
                    <View style={styles.table}>
                        <View style={styles.headerRow}>
                            {interventionCols.map((c) => (
                                <Text key={c.label} style={[styles.cell, { width: c.width, fontWeight: "bold" }]}>
                                    {c.label}
                                </Text>
                            ))}
                        </View>
                        {interventions.map((it) => (
                            <View key={it.id} style={styles.row}>
                                <Text style={[styles.cell, { width: "12%" }]}>{formatDate(it.date)}</Text>
                                <Text style={[styles.cell, { width: "16%" }]}>{it.type}</Text>
                                <Text style={[styles.cell, { width: "34%" }]}>{it.description}</Text>
                                <Text style={[styles.cell, { width: "10%" }]}>
                                    {it.engineHours != null ? `${it.engineHours.toFixed(1)} h` : "—"}
                                </Text>
                                <Text style={[styles.cell, { width: "18%" }]}>{it.comment ?? ""}</Text>
                                <Text style={[styles.cell, { width: "10%" }]}>{it.createdByName}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.footer}>
                    <Text>Généré par AeroConnect — {formatDate(generatedAt)}</Text>
                    <Text>{planeRegistration}</Text>
                </View>
            </Page>
        </Document>
    );
};
