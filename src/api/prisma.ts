// src/api/prisma.ts
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// Déclarez le type étendu
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  }).$extends(withAccelerate())
}

// Utilisez ReturnType pour capturer le type exact
declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export default prisma