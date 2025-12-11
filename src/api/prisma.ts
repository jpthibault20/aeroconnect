import { PrismaClient } from '@prisma/client'

// Ajout du type pour l'objet global
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// On utilise l'instance existante si elle est dispo, sinon on en crée une nouvelle
const prisma = globalForPrisma.prisma ?? new PrismaClient()

export default prisma

// En dev, on sauvegarde l'instance dans l'objet global pour la réutiliser au prochain reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}