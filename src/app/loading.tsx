import LoadingPage from '@/components/LoadingPage';

// Loading of the signed-in area (protected layout: session + club), e.g. right
// after login. No navigation yet: full screen.
export default function Loading() {
    return <LoadingPage className="min-h-screen" />;
}
