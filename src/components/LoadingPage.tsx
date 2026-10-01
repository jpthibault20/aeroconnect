"use client"
import FlightLoader from "@/components/loader/FlightLoader"

/** Full page loading (Suspense fallback, loading.tsx): AER-70 animation. */
const LoadingPage = ({ className }: { className?: string }) => {
    return <FlightLoader variant="page" className={className} />
}

export default LoadingPage
