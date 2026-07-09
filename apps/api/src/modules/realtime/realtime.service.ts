import { WebSocket } from "ws";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { RealtimeClient, ServerRealtimeMessage } from "./realtime.types.js";

export class RealtimeService {
  private readonly clients = new Map<string, RealtimeClient>();
  private runtimeInterval: NodeJS.Timeout | null = null;
  private lastP1001LoggedAt = 0;

  addClient(userId: string, socket: WebSocket): RealtimeClient {
    const client: RealtimeClient = {
      id: crypto.randomUUID(),
      userId,
      socket,
      subscribedStrategyIds: new Set<string>(),
      connectedAt: new Date(),
      lastSeenAt: new Date(),
    };
    this.clients.set(client.id, client);
    return client;
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  getClient(clientId: string): RealtimeClient | undefined {
    return this.clients.get(clientId);
  }

  subscribeStrategy(clientId: string, strategyId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedStrategyIds.add(strategyId);
    }
  }

  unsubscribeStrategy(clientId: string, strategyId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedStrategyIds.delete(strategyId);
    }
  }

  send(client: RealtimeClient, message: ServerRealtimeMessage): void {
    if (client.socket.readyState !== WebSocket.OPEN) {
      this.removeClient(client.id);
      return;
    }
    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      this.removeClient(client.id);
    }
  }

  logPerformanceStats(app: FastifyInstance): void {
    const activeClientsCount = this.clients.size;
    let totalSubscribed = 0;
    for (const c of this.clients.values()) {
      totalSubscribed += c.subscribedStrategyIds.size;
    }
    app.log.info(
      `[Performance] Active WS clients: ${activeClientsCount}, Subscribed strategies: ${totalSubscribed}, Broadcasts/sec: ${totalSubscribed}`
    );
  }

  publishStrategyDataChanged(
    strategyId: string,
    scopes: Array<"logs" | "orders" | "positions" | "strategy" | "runtime">
  ): void {
    try {
      const message: ServerRealtimeMessage = {
        type: "strategy_data_changed",
        strategyId,
        scopes,
        ts: Date.now(),
      };

      for (const [clientId, client] of Array.from(this.clients.entries())) {
        if (client.subscribedStrategyIds.has(strategyId)) {
          try {
            this.send(client, message);
          } catch (error) {
            this.removeClient(clientId);
          }
        }
      }
    } catch (error) {
      // publishStrategyDataChanged should never throw
    }
  }

  startRuntimeStatusBroadcast(
    app: FastifyInstance,
    getRuntimeStatus: (userId: string, strategyId: string) => Promise<unknown>
  ): void {
    if (this.runtimeInterval) {
      return;
    }

    app.log.info("[Realtime] Runtime broadcaster started");

    this.runtimeInterval = setInterval(async () => {
      // If no clients or no subscribed strategies, skip work
      if (this.clients.size === 0) {
        return;
      }
      let hasSubscriptions = false;
      for (const client of this.clients.values()) {
        if (client.subscribedStrategyIds.size > 0) {
          hasSubscriptions = true;
          break;
        }
      }
      if (!hasSubscriptions) {
        return;
      }

      // Loop over all connected clients safely using entries
      for (const [clientId, client] of Array.from(this.clients.entries())) {
        if (client.socket.readyState !== WebSocket.OPEN) {
          this.removeClient(clientId);
          continue;
        }

        // Loop over each client.subscribedStrategyIds
        for (const strategyId of Array.from(client.subscribedStrategyIds)) {
          try {
            const runtimeStatus = await getRuntimeStatus(
              client.userId,
              strategyId
            );
            this.send(client, {
              type: "strategy_runtime_status",
              strategyId,
              data: runtimeStatus,
            });
          } catch (error) {
            const isP1001 = error && (
              (error as any).code === "P1001" ||
              (error as any).message?.includes("P1001") ||
              (error as any).message?.includes("Can't reach database server")
            );

            if (isP1001) {
              const now = Date.now();
              if (now - this.lastP1001LoggedAt > 60000) {
                this.lastP1001LoggedAt = now;
                app.log.error(
                  { userId: client.userId, strategyId, errorCode: "P1001" },
                  "Database connection error (P1001) during strategy runtime status broadcast (throttled)"
                );
              }
              this.send(client, {
                type: "strategy_runtime_status_error",
                strategyId,
                message: "Database connection failed. Please check if database is running.",
              });
            } else {
              app.log.error(
                { userId: client.userId, strategyId, error },
                "Error loading strategy runtime status for realtime stream"
              );
              this.send(client, {
                type: "strategy_runtime_status_error",
                strategyId,
                message: "Unable to load runtime status",
              });
            }
          }
        }
      }
    }, 1000);
  }

  stopRuntimeStatusBroadcast(): void {
    if (this.runtimeInterval) {
      clearInterval(this.runtimeInterval);
      this.runtimeInterval = null;
    }
  }
}

const globalForRealtime = globalThis as {
  realtimeService?: RealtimeService;
};

export const realtimeService = globalForRealtime.realtimeService ?? new RealtimeService();

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.realtimeService = realtimeService;
}

