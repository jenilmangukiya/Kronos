import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";

import { JwtService } from "../services/jwt.service.js";
import { AppError } from "../errors/app-error.js";
export default fp(async (app) => {
  const jwtService = new JwtService();

  app.decorate("authenticate", async function (request: FastifyRequest) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const token = authHeader.substring(7);

    const payload = jwtService.verifyAccessToken(token);

    const user = await app.db.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  });
});
