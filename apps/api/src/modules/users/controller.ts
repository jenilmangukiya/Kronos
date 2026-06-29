import { FastifyInstance } from "fastify";

export async function getUsers(db: FastifyInstance["db"]) {
  return db.user.findMany();
}
