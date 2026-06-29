import { FastifyInstance } from "fastify";

export class UsersService {
  constructor(private readonly db: FastifyInstance["db"]) {}

  async getAll() {
    return this.db.user.findMany();
  }
}
