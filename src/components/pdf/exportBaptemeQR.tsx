"use client";

import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";

interface Props {
    clubName: string | null;
    qrDataUrl: string;
    url: string;
}

const styles = StyleSheet.create({
    page: {
        padding: 48,
        fontFamily: "Helvetica",
        alignItems: "center",
        justifyContent: "center",
    },
    club: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 8, textAlign: "center" },
    title: { fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 4, textAlign: "center", color: "#774BBE" },
    subtitle: { fontSize: 14, marginBottom: 28, textAlign: "center", color: "#444444" },
    qr: { width: 260, height: 260, marginBottom: 24 },
    hint: { fontSize: 12, textAlign: "center", color: "#666666", marginBottom: 6 },
    url: { fontSize: 10, textAlign: "center", color: "#999999" },
    footer: { position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#bbbbbb" },
});

export const BaptemeQRDocument = ({ clubName, qrDataUrl, url }: Props) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={{ alignItems: "center" }}>
                {clubName && <Text style={styles.club}>{clubName}</Text>}
                <Text style={styles.title}>Réservez votre vol baptême</Text>
                <Text style={styles.subtitle}>Scannez ce QR code pour choisir votre créneau</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qrDataUrl} style={styles.qr} />
                <Text style={styles.hint}>Ou rendez-vous sur :</Text>
                <Text style={styles.url}>{url}</Text>
            </View>
            <Text style={styles.footer}>Généré par AeroConnect</Text>
        </Page>
    </Document>
);

export default BaptemeQRDocument;
