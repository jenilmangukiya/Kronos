import { FastifyInstance } from "fastify";

import { AuthController } from "./controller.js";
import { AuthService } from "./service.js";
import { RegisterInput } from "./types.js";

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.db);
  const authController = new AuthController(authService);

  app.post("/auth/register", async (request) => {
    return authController.register(request.body as RegisterInput);
  });
}
