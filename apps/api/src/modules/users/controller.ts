import { UsersService } from "./service.js";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  async getAll() {
    return this.usersService.getAll();
  }
}
