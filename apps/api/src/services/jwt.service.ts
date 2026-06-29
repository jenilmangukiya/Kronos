import jwt from "jsonwebtoken";
import ms from "ms";

import { config } from "@kronos/config";
import { JwtPayload } from "./jwt.types";

export class JwtService {
  generateAccessToken(payload: JwtPayload) {
    return jwt.sign(payload, config.auth.jwt.secret, {
      expiresIn: config.auth.jwt.accessExpiresIn,
    });
  }

  generateRefreshToken(payload: JwtPayload) {
    return jwt.sign(payload, config.auth.jwt.secret, {
      expiresIn: config.auth.jwt.refreshExpiresIn,
    });
  }

  verifyAccessToken(token: string) {
    return jwt.verify(token, config.auth.jwt.secret) as JwtPayload;
  }

  verifyRefreshToken(token: string) {
    return jwt.verify(token, config.auth.jwt.secret) as JwtPayload;
  }

  getRefreshTokenExpiry() {
    return new Date(Date.now() + ms(config.auth.jwt.refreshExpiresIn));
  }
}
