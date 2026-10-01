import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
    searchParams: Promise<{ ms?: string }>
}

// Deliberately slow page: triggers the real (protected)/loading.tsx, then the
// landing when the server render arrives. Development only.
export default async function Page({ searchParams }: PageProps) {
    if (process.env.NODE_ENV === 'production') notFound();
    const { ms } = await searchParams;
    const delay = Math.min(Math.max(Number(ms) || 3000, 0), 30000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return (
        <div className="h-full bg-gray-100 p-6">
            <div className="mx-auto max-w-xl rounded-xl border bg-white p-6 shadow-sm">
                <h1 className="text-lg font-semibold text-gray-900">Page chargée ✓</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Rendu serveur retardé de {delay} ms. L&apos;avion doit avoir atterri puis disparu en fondu.
                </p>
                <Link href="/dev-loader" className="mt-4 inline-block text-sm font-medium text-[#774BBE] hover:underline">
                    ← Retour au banc d&apos;essai
                </Link>
            </div>
        </div>
    );
}
