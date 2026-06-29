import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  APP_PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  JWT_SECRET: z.string().min(1),

  JWT_ACCESS_EXPIRES_IN: z.string(),

  JWT_REFRESH_EXPIRES_IN: z.string(),
});

export type Env = z.infer<typeof envSchema>;
