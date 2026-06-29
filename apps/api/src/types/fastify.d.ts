import "fastify";
import { prisma } from "@kronos/database";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof prisma;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}
