export interface RegisterInput {
  name?: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string | null;
}
