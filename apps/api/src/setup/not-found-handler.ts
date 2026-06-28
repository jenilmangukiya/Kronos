import { FastifyInstance } from "fastify";

export function setupNotFoundHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}
