// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// Keep the singleton across hot-reloads in dev AND across invocations in
// the same Vercel container in prod (containers are reused when warm).
globalForPrisma.prisma = prisma;