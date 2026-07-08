import { WebSocket } from "ws";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import { RealtimeClient, ServerRealtimeMessage } from "./realtime.types.js";
import { StrategyService } from "../strategies/service.js";

export class RealtimeService {
  private readonly clients = new Map<string, RealtimeClient>();
  private runtimeInterval: NodeJS.Timeout | null = null;

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

  startRuntimeStatusBroadcast(app: FastifyInstance): void {
    if (this.runtimeInterval) {
      return;
    }

    const strategyService = new StrategyService(app, app.db);

    this.runtimeInterval = setInterval(async () => {
      // Loop over all connected clients safely using entries
      for (const [clientId, client] of Array.from(this.clients.entries())) {
        if (client.socket.readyState !== WebSocket.OPEN) {
          this.removeClient(clientId);
          continue;
        }

        // Loop over each client.subscribedStrategyIds
        for (const strategyId of Array.from(client.subscribedStrategyIds)) {
          try {
            const runtimeStatus = await strategyService.getRuntimeStatus(
              client.userId,
              strategyId
            );
            this.send(client, {
              type: "strategy_runtime_status",
              strategyId,
              data: runtimeStatus,
            });
          } catch (error) {
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
    }, 1000);
  }

  stopRuntimeStatusBroadcast(): void {
    if (this.runtimeInterval) {
      clearInterval(this.runtimeInterval);
      this.runtimeInterval = null;
    }
  }
}
