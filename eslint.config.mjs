// ESLint flat config. Next 16 removed `next lint`: linting now goes through the
// ESLint binary (`npm run lint`), which no longer reads `.eslintrc.json`.
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
