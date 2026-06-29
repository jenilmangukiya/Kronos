import { FastifyInstance } from "fastify";
import prismaPlugin from "./prisma";

export async function registerPlugins(app: FastifyInstance) {
  await app.register(prismaPlugin);
  // Database
  // Redis
  // JWT
}
