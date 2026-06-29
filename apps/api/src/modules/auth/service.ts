import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";

import type { LoginInput, RegisterInput } from "./types.js";
import { AppError } from "../../errors/app-error.js";
import { JwtService } from "../../services/jwt.service.js";

export class AuthService {
  constructor(
    private readonly db: FastifyInstance["db"],
    private readonly jwtService: JwtService,
  ) {}

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

  async login(input: LoginInput) {
    const user = await this.db.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new AppError(
        "Invalid email or password",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
    });

    const refreshToken = this.jwtService.generateRefreshToken({
      userId: user.id,
    });

    await this.db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: this.jwtService.getRefreshTokenExpiry(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }
}
