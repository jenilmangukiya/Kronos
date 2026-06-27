import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  APP_PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;