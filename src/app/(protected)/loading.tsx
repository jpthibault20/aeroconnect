import LoadingPage from '@/components/LoadingPage';

// Affiché dès le clic dans la navigation, le temps que le serveur rende la
// page suivante : sans lui, l'écran restait figé et semblait planté (AER-70).
export default function Loading() {
    return <LoadingPage />;
}
