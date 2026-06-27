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
} as const;

export type Config = typeof config;