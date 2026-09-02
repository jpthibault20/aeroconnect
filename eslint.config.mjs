// Configuration ESLint en « flat config ».
// Next 16 a supprimé la commande `next lint` : le lint passe désormais par
// l'exécutable ESLint (`npm run lint`), qui ne lit plus `.eslintrc.json`.
// `eslint-config-next` expose directement des tableaux de flat config.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
    {
        ignores: [
            ".next/**",
            "out/**",
            "build/**",
            "coverage/**",
            "next-env.d.ts",
            "prisma/migrations/**",
            "prisma/migrations_old_backup/**",
            "public/**",
            "static/**",
        ],
    },
    ...nextCoreWebVitals,
    ...nextTypescript,
];

export default eslintConfig;
