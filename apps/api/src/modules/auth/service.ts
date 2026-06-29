import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";

import type { LoginInput, RefreshInput, RegisterInput } from "./types.js";
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

  async refresh(input: RefreshInput) {
    const payload = this.jwtService.verifyRefreshToken(input.refreshToken);

    const storedToken = await this.db.refreshToken.findUnique({
      where: {
        token: input.refreshToken,
      },
    });

    if (!storedToken) {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const user = await this.db.user.findUnique({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
    });

    const refreshToken = this.jwtService.generateRefreshToken({
      userId: user.id,
    });

    const expiresAt = this.jwtService.getRefreshTokenExpiry();

    await this.db.$transaction(async (tx) => {
      await tx.refreshToken.delete({
        where: {
          token: input.refreshToken,
        },
      });

      await tx.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
