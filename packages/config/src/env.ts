import dotenv from "dotenv";

import { envSchema } from "./schema.js";

dotenv.config();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables");
  console.error(parsed.error.format());

  process.exit(1);
}

export const env = parsed.data;