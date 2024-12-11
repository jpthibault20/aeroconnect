import { getClub } from "@/api/db/club";
import { useCurrentUser } from "@/app/context/useCurrentUser";
import { Club } from "@prisma/client";
import { useEffect, useState } from "react";
import { Spinner } from "./ui/SpinnerVariants";

interface props {
    clubIDprops: string
}
const WaitingClubResponse = ({ clubIDprops }: props) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [club, setClub] = useState<Club>();
    const { currentUser } = useCurrentUser();

    const fetchClub = async () => {
        setLoading(true);
        setError(null);

        try {
            const fetchedClub = await getClub(currentUser?.clubIDRequest || clubIDprops);
            if (fetchedClub) {
                setClub(fetchedClub);
            } else {
                setError("Aucun club trouvé avec cet ID.");
            }
        } catch (err) {
            console.error("Erreur lors de la récupération des clubs :", err);
            setError("Impossible de charger les clubs. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClub();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            {loading ? (
                <p>Chargement...</p>
            ) : error ? (
                <p>Erreur : {error}</p>
            ) : (
                <div className="flex flex-col items-center space-y-4 text-center border-t pt-3">
                    <p>
                        Le club &quot;
                        <span className="italic">{club?.Name}</span>
                        &quot; n&apos;a pas encore répondu à votre demande.
                    </p>
                    <Spinner />
                    <p className="text-gray-500">
                        Vous recevrez un email de confirmation dès que votre demande sera acceptée.
                    </p>
                </div>
            )}
        </div>
    )
}

export default WaitingClubResponse
