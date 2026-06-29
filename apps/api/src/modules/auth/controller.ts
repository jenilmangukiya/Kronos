import { AuthService } from "./service.js";
import type { LoginInput, RegisterInput } from "./types.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(input: RegisterInput) {
    return this.authService.register(input);
  }

  async login(input: LoginInput) {
    return this.authService.login(input);
  }
}
