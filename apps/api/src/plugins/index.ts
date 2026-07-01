import { FastifyInstance } from "fastify";
import prismaPlugin from "./prisma.js";
import authPlugin from "./auth.js";
import swaggerPlugin from "./swagger.js";
import corsPlugin from "./cors.js";

export async function registerPlugins(app: FastifyInstance) {
  await app.register(corsPlugin);

  await app.register(prismaPlugin);

  await app.register(authPlugin);

  await app.register(swaggerPlugin);
}
