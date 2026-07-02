import type { AngelTick } from "./types.js";

export class LiveTickStore {
  private readonly ticks = new Map<string, AngelTick>();

  private getKey(brokerAccountId: string, token: string) {
    return `${brokerAccountId}:${token}`;
  }

  setTick(brokerAccountId: string, tick: AngelTick) {
    this.ticks.set(this.getKey(brokerAccountId, tick.token), tick);
  }

  getTick(brokerAccountId: string, token: string) {
    return this.ticks.get(this.getKey(brokerAccountId, token)) ?? null;
  }

  getMany(brokerAccountId: string, tokens: string[]) {
    return tokens.map((token) => ({
      token,
      tick: this.getTick(brokerAccountId, token),
    }));
  }

  clearBroker(brokerAccountId: string) {
    for (const key of this.ticks.keys()) {
      if (key.startsWith(`${brokerAccountId}:`)) {
        this.ticks.delete(key);
      }
    }
  }

  clear() {
    this.ticks.clear();
  }
}

export const liveTickStore = new LiveTickStore();
