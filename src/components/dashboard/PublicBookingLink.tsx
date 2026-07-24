"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { useCurrentClub } from "@/app/context/useCurrentClub";
import { canManagePublicLink } from "@/lib/bapteme";
import { regeneratePublicBookingToken } from "@/api/db/bapteme";
import BaptemeQRDocument from "@/components/pdf/exportBaptemeQR";
import { Copy, Download, RefreshCw, Share2, LinkIcon, QrCode } from "lucide-react";

interface Props {
    clubID: string;
    initialToken: string | null;
}

const PublicBookingLink = ({ clubID, initialToken }: Props) => {
    const { currentUser } = useCurrentUser();
    const { currentClub } = useCurrentClub();
    const clubName = currentClub?.Name ?? null;
    const [token, setToken] = useState<string | null>(initialToken);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Lien construit côté client à partir de l'origine réelle (évite toute
    // incohérence de variable d'environnement de base URL).
    const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/reservation/${clubID}/${token}` : "";

    useEffect(() => {
        if (!url) {
            setQrDataUrl("");
            return;
        }
        QRCode.toDataURL(url, { width: 512, margin: 1 })
            .then(setQrDataUrl)
            .catch(() => setQrDataUrl(""));
    }, [url]);

    if (!currentUser) return null;

    // Tout membre peut consulter / partager le lien ; seuls le président et
    // l'administrateur peuvent le (re)générer.
    const canManage = canManagePublicLink(currentUser.role);

    const onRegenerate = async () => {
        setLoading(true);
        const res = await regeneratePublicBookingToken(clubID);
        setLoading(false);
        setConfirmOpen(false);
        if ("error" in res) {
            toast({ title: "Erreur", description: res.error, variant: "destructive" });
            return;
        }
        setToken(res.token);
        toast({ title: "Lien régénéré", description: res.success, className: "bg-green-600 text-white border-none" });
    };

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast({ title: "Lien copié", className: "bg-green-600 text-white border-none" });
        } catch {
            toast({ title: "Impossible de copier le lien", variant: "destructive" });
        }
    };

    const onExportPdf = async () => {
        if (!qrDataUrl) return;
        try {
            const blob = await pdf(
                <BaptemeQRDocument clubName={clubName} qrDataUrl={qrDataUrl} url={url} />
            ).toBlob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `qr-bapteme-${clubID}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch {
            toast({ title: "Erreur lors de l'export PDF", variant: "destructive" });
        }
    };

    // Smartphone : partage natif (enregistrement dans la pellicule) avec repli
    // téléchargement de l'image PNG.
    const onShareImage = async () => {
        if (!qrDataUrl) return;
        try {
            const blob = await (await fetch(qrDataUrl)).blob();
            const file = new File([blob], `qr-bapteme-${clubID}.png`, { type: "image/png" });
            const nav = navigator as Navigator & {
                canShare?: (data: { files: File[] }) => boolean;
                share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
            };
            if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
                await nav.share({ files: [file], title: "QR baptême", text: "Réservez votre vol baptême" });
                return;
            }
            const link = document.createElement("a");
            link.href = qrDataUrl;
            link.download = `qr-bapteme-${clubID}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            toast({ title: "Partage impossible", variant: "destructive" });
        }
    };

    return (
        <Card className="border-none shadow-none md:border md:shadow-sm bg-transparent md:bg-white">
            <CardHeader className="px-0 md:px-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-[#774BBE]" />
                    Lien public de réservation
                </CardTitle>
                <CardDescription>
                    Partagez ce lien / QR code pour permettre à vos clients de réserver un
                    baptême sans compte.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0 md:p-6 space-y-5">
                {!token ? (
                    <div className="text-center py-8 space-y-4">
                        <p className="text-sm text-slate-500">
                            Aucun lien public n&apos;est actif pour le moment.
                        </p>
                        {canManage ? (
                            <Button
                                onClick={onRegenerate}
                                disabled={loading}
                                className="bg-[#774BBE] hover:bg-[#6538a5] text-white"
                            >
                                <QrCode className="w-4 h-4 mr-2" /> Générer le lien public
                            </Button>
                        ) : (
                            <p className="text-sm text-slate-400">
                                Demandez au président ou à l&apos;administrateur du club de
                                le générer.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            {qrDataUrl && (
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={qrDataUrl} alt="QR code de réservation" className="w-40 h-40" />
                                </div>
                            )}
                            <div className="flex-1 w-full space-y-3">
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <span className="text-xs text-slate-600 truncate flex-1">{url}</span>
                                    <Button variant="ghost" size="sm" onClick={onCopy} className="h-8 px-2">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" onClick={onExportPdf}>
                                        <Download className="w-4 h-4 mr-2" /> Exporter en PDF
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={onShareImage}>
                                        <Share2 className="w-4 h-4 mr-2" /> Enregistrer / Partager
                                    </Button>
                                    {canManage && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setConfirmOpen(true)}
                                            className="text-amber-700 border-amber-200 hover:bg-amber-50"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" /> Régénérer
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>

            {/* Disclaimer de régénération */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-amber-600" /> Régénérer le lien public ?
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-left">
                            ⚠️ En régénérant le lien, l&apos;ancien lien cessera immédiatement de
                            fonctionner. Tous les endroits où il est publié (site web, réseaux
                            sociaux, QR codes imprimés, Google…) devront être mis à jour, sinon
                            vos visiteurs tomberont sur une page invalide.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={loading}>
                            Annuler
                        </Button>
                        <Button
                            onClick={onRegenerate}
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {loading ? "Régénération…" : "Oui, régénérer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default PublicBookingLink;
