// src/api/prisma.ts
import { PrismaClient } from '@prisma/client'

// Le journal des requêtes SQL est très verbeux (chaque ouverture de page en
// déclenche plusieurs dizaines) : il n'est activé qu'à la demande, via
// PRISMA_LOG_QUERIES=1 dans .env. En dev, on garde les erreurs et warnings.
const prismaClientSingleton = () => {
  const isDev = process.env.NODE_ENV === 'development'
  const logQueries = isDev && process.env.PRISMA_LOG_QUERIES === '1'
  return new PrismaClient({
    log: [
      ...(logQueries ? ['query' as const] : []),
      'error',
      ...(isDev ? ['warn' as const] : []),
    ],
  })
}

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export default prisma
