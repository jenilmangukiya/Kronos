import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { AuthController } from "./controller.js";
import { AuthService } from "./service.js";
import { JwtService } from "../../services/jwt.service.js";
import {
  registerBodySchema,
  registerResponseSchema,
  loginBodySchema,
  loginResponseSchema,
  refreshBodySchema,
  refreshResponseSchema,
} from "./schemas.js";

export async function authRoutes(app: FastifyInstance) {
  const jwtService = new JwtService();
  const authService = new AuthService(app.db, jwtService);
  const authController = new AuthController(authService);
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Register a new user",
        body: registerBodySchema,
        response: {
          200: registerResponseSchema,
        },
      },
    },
    async (request) => {
      return authController.register(request.body);
    },
  );

  typedApp.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log in a user",
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    async (request) => {
      return authController.login(request.body);
    },
  );

  typedApp.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["Auth"],
        summary: "Refresh authenticating session",
        body: refreshBodySchema,
        response: {
          200: refreshResponseSchema,
        },
      },
    },
    async (request) => {
      return authController.refresh(request.body);
    },
  );
}
