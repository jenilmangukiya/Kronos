import { config } from "@kronos/config";
import type { TransportTargetOptions } from "pino";

export const transport: TransportTargetOptions | undefined =
  config.app.env === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined;