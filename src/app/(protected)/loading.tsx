import LoadingPage from '@/components/LoadingPage';

// Shown as soon as a navigation link is clicked, while the server renders the
// next page: without it the screen froze and looked broken (AER-70).
export default function Loading() {
    return <LoadingPage />;
}
