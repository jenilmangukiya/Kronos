import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";

import type { RegisterInput } from "./types.js";
import { AppError } from "../../errors/app-error.js";

export class AuthService {
  constructor(private readonly db: FastifyInstance["db"]) {}

  async register(input: RegisterInput) {
    const existingUser = await this.db.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (existingUser) {
      throw new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await this.db.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return user;
  }
}
