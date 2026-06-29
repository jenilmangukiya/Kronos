import { FastifyInstance } from "fastify";
import { getUsers } from "./controller.js";

export async function usersRoutes(app: FastifyInstance) {
  app.get("/users", async () => {
    return getUsers(app.db);
  });
}
