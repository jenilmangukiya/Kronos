import { config } from "@kronos/config";

export async function healthController() {
  return {
    status: "ok",
    service: "api",
    environment: config.app.env,
    timestamp: new Date().toISOString(),
  };
}
