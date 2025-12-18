import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL, // Utilisez l'URL directe ici
  },
});