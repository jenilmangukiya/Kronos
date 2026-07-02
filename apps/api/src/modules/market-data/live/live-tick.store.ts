import type { AngelTick } from "./types.js";

export class LiveTickStore {
  private readonly ticks = new Map<string, AngelTick>();

  setTick(tick: AngelTick) {
    this.ticks.set(tick.token, tick);
  }

  getTick(token: string) {
    return this.ticks.get(token) ?? null;
  }

  getMany(tokens: string[]) {
    return tokens.map((token) => ({
      token,
      tick: this.getTick(token),
    }));
  }

  getAll() {
    return Array.from(this.ticks.values());
  }

  clear() {
    this.ticks.clear();
  }
}

export const liveTickStore = new LiveTickStore();
