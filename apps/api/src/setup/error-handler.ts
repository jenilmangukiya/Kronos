import { FastifyInstance } from "fastify";

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(error);

    return reply.code(error.statusCode ?? 500).send({
      success: false,
      error: {
        code: error.code ?? "INTERNAL_SERVER_ERROR",
        message: error.message,
      },
    });
  });
}
