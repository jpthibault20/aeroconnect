"use client"
import FlightLoader from "@/components/loader/FlightLoader"

/** Chargement d'une page entière (fallback Suspense, loading.tsx) — animation AER-70. */
const LoadingPage = ({ className }: { className?: string }) => {
    return <FlightLoader variant="page" className={className} />
}

export default LoadingPage
