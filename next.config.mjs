import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */

// Pin the project root explicitly. Otherwise Turbopack infers it by walking up
// looking for lockfiles and picks the outermost one (a stray package-lock.json in
// the user profile), making it watch the whole profile instead of the repo.
const projectRoot = dirname(fileURLToPath(import.meta.url));

// Supabase host, derived from NEXT_PUBLIC_SUPABASE_URL when available at build
// time. Plane photos are served from a public Supabase Storage bucket; without
// this entry next/image refuses to optimize them. Falls back to a wildcard.
const supabaseHostname = (() => {
    try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    } catch {
        return "**.supabase.co";
    }
})();

const nextConfig = {
    allowedDevOrigins: ["192.168.1.148", "localhost"],
    turbopack: {
        root: projectRoot,
    },
    experimental: {
        // Plane photos (src/lib/planeImage.ts) are accepted up to 2 MB server-side. The
        // default Server Actions limit (1 MB) would silently reject the upload before
        // `uploadPlaneImage` runs, with a generic network error on the client.
        serverActions: {
            bodySizeLimit: "3mb",
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: supabaseHostname,
                pathname: "/storage/v1/object/public/**",
            },
        ],
    },
};

export default nextConfig;
