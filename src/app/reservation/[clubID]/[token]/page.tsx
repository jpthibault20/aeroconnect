import { getPublicBaptemeSlots } from "@/api/db/bapteme";
import PublicBaptemeForm from "@/components/bapteme/PublicBaptemeForm";
import { PlaneTakeoff } from "lucide-react";

interface PageProps {
    params: Promise<{ clubID: string; token: string }>;
}

const Page = async ({ params }: PageProps) => {
    const { clubID, token } = await params;
    const result = await getPublicBaptemeSlots(clubID, token);

    if ("error" in result) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                    <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                        <PlaneTakeoff className="h-7 w-7 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Lien indisponible</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Ce lien de réservation n&apos;est plus valide ou a expiré. Merci de
                        contacter le club pour obtenir le lien à jour.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <PublicBaptemeForm
            clubID={clubID}
            token={token}
            clubName={result.clubName}
            slots={result.slots}
        />
    );
};

export default Page;
