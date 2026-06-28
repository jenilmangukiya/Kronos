import pino from "pino";

import { transport } from "./transport";
import { config } from "@kronos/config";

export function createLogger(service: string) {
  return pino({
    name: "kronos",
    level: config.logging.level,
    transport,
  }).child({
    service,
  });
}
