import type { BrokerClient } from "./broker-client.js";

export class KotakClient implements BrokerClient {
  getName() {
    return "KOTAK";
  }
}
