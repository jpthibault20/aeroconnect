import LoadingPage from '@/components/LoadingPage';

// Chargement de l'espace connecté (layout protégé : session + club), par
// exemple juste après la connexion. Pas encore de navigation : plein écran.
export default function Loading() {
    return <LoadingPage className="min-h-screen" />;
}
