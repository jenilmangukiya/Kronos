import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  environment: z.string(),
  timestamp: z.string(),
});
