import { FastifyInstance } from "fastify";

import { AuthController } from "./controller.js";
import { AuthService } from "./service.js";
import { JwtService } from "../../services/jwt.service.js";
import { LoginInput, RefreshInput, RegisterInput } from "./types.js";

export async function authRoutes(app: FastifyInstance) {
  const jwtService = new JwtService();
  const authService = new AuthService(app.db, jwtService);
  const authController = new AuthController(authService);

  app.post("/auth/register", async (request) => {
    return authController.register(request.body as RegisterInput);
  });

  app.post("/auth/login", async (request) => {
    return authController.login(request.body as LoginInput);
  });

  app.post("/auth/refresh", async (request) => {
    return authController.refresh(request.body as RefreshInput);
  });
}
