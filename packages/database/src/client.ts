import { config } from "@kronos/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (config.app.env !== "production") {
  globalForPrisma.prisma = prisma;
}
