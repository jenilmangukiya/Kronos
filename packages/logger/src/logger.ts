import pino from "pino";

import { transport } from "./transport";
import { config } from "@kronos/config";

export const loggerOptions = {
  name: "kronos",
  level: config.logging.level,
  transport,
};

export function createLogger(service: string) {
  return pino(loggerOptions).child({
    service,
  });
}
