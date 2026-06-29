import { AuthService } from "./service.js";
import type { LoginInput, RefreshInput, RegisterInput } from "./types.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(input: RegisterInput) {
    return this.authService.register(input);
  }

  async login(input: LoginInput) {
    return this.authService.login(input);
  }

  async refresh(input: RefreshInput) {
    return this.authService.refresh(input);
  }
}
