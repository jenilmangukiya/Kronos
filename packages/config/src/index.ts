import { env } from "./env";

export const config = {
  app: {
    name: "Kronos",
    env: env.NODE_ENV,
    port: env.APP_PORT,
  },

  database: {
    url: env.DATABASE_URL,
  },

  redis: {
    url: env.REDIS_URL,
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  auth: {
    jwt: {
      secret: env.JWT_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  },
} as const;

export type Config = typeof config;
