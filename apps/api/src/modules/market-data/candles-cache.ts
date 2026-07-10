interface CacheEntry {
  data: any;
  timestamp: number;
}

export class CandlesCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 15000; // 15 seconds TTL

  private getKey(
    brokerAccountId: string,
    exchange: string,
    symboltoken: string,
    interval: string,
    fromDate: string,
    toDate: string,
  ): string {
    return `${brokerAccountId}:${exchange}:${symboltoken}:${interval}:${fromDate}:${toDate}`;
  }

  get(
    brokerAccountId: string,
    exchange: string,
    symboltoken: string,
    interval: string,
    fromDate: string,
    toDate: string,
  ): any | null {
    const key = this.getKey(
      brokerAccountId,
      exchange,
      symboltoken,
      interval,
      fromDate,
      toDate,
    );
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(
    brokerAccountId: string,
    exchange: string,
    symboltoken: string,
    interval: string,
    fromDate: string,
    toDate: string,
    data: any,
  ): void {
    const key = this.getKey(
      brokerAccountId,
      exchange,
      symboltoken,
      interval,
      fromDate,
      toDate,
    );
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const candlesCache = new CandlesCache();
