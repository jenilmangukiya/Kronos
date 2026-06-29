import { FastifyInstance } from "fastify";
import prismaPlugin from "./prisma";
import authPlugin from "./auth";

export async function registerPlugins(app: FastifyInstance) {
  await app.register(prismaPlugin);

  await app.register(authPlugin);
  // Database
  // Redis
  // JWT
}
