/** @type {import('next').NextConfig} */

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
