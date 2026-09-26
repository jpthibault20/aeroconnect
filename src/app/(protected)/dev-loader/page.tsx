import { notFound } from 'next/navigation';
import Playground from './Playground';

// Banc d'essai de l'animation de chargement (AER-70). Réservé au développement :
// 404 sur un build de production.
export default function Page() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Playground />;
}
