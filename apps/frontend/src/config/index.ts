export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  isDev: import.meta.env.DEV,
};
