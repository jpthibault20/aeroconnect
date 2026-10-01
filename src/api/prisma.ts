import { PrismaClient } from '@prisma/client'

// SQL query logging is very verbose (each page load triggers dozens), so it is
// only enabled on demand via PRISMA_LOG_QUERIES=1 in .env. In dev, errors and
// warnings are kept.
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
