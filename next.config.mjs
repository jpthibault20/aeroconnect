import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */

// Racine du projet, figée explicitement. Sans ça, Turbopack la déduit en
// remontant l'arborescence à la recherche de lockfiles et retient le plus
// externe — ici un package-lock.json isolé à la racine du profil utilisateur,
// qui lui ferait surveiller tout le profil (OneDrive compris) au lieu du seul
// dépôt.
const projectRoot = dirname(fileURLToPath(import.meta.url));

// Hôte du projet Supabase, déduit de NEXT_PUBLIC_SUPABASE_URL quand elle est
// disponible au build. Les photos de machines sont servies depuis le bucket
// public de Supabase Storage : sans cette autorisation, next/image refuse de
// les optimiser. Repli sur un joker si la variable manque au moment du build.
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
