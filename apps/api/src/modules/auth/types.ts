export interface RegisterInput {
  name?: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;

  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface RefreshInput {
  refreshToken: string;
}
