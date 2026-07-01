import { z } from "zod";
import type { StringValue } from "ms";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  APP_PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  JWT_SECRET: z.string().min(1),

  JWT_ACCESS_EXPIRES_IN: z.custom<StringValue>(),

  JWT_REFRESH_EXPIRES_IN: z.custom<StringValue>(),

  KOTAK_LOGIN_BASE_URL: z.url(),

  ANGEL_BASE_URL: z.string().url(),
  ANGEL_WS_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;
