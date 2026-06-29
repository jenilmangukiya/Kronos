import { FastifyInstance } from "fastify";
import { AppError } from "../errors/app-error";

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    });
  });
}
