import { z } from "zod";
import { registerBodySchema, loginBodySchema, refreshBodySchema } from "./schemas.js";

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type RefreshInput = z.infer<typeof refreshBodySchema>;

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;

  user: {
    id: string;
    email: string;
    name: string | null;
  };
}
