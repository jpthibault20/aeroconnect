"use client"
import { Skeleton } from "@/components/ui/skeleton"

const LoadingPage = () => {
    return (
        <div className="container mx-auto p-4 space-y-4">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-8 w-32" />
            </div>

            {/* Main content skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
            </div>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                        <Skeleton className="h-32 w-full rounded-md" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                ))}
            </div>

            {/* Footer skeleton */}
            <div className="mt-8 pt-8 border-t">
                <Skeleton className="h-8 w-full max-w-md mx-auto" />
            </div>
        </div>
    )
}

export default LoadingPage
