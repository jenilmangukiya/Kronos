import fp from "fastify-plugin";
import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

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

    let payload: { userId: string };

    try {
      payload = jwtService.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError("Access token expired", 401, "ACCESS_TOKEN_EXPIRED");
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError("Invalid access token", 401, "INVALID_ACCESS_TOKEN");
      }

      throw error;
    }

    const user = await app.db.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
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
