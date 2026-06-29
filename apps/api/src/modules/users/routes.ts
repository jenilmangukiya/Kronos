import { FastifyInstance } from "fastify";
import { UsersController } from "./controller.js";
import { UsersService } from "./service.js";

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService(app.db);
  const usersController = new UsersController(usersService);

  app.get("/users", async () => {
    return usersController.getAll();
  });
}
