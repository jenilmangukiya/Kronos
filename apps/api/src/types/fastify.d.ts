import "fastify";
import { prisma } from "@kronos/database";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof prisma;
  }
}
