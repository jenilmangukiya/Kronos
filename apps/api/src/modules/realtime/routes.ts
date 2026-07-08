import { FastifyInstance } from "fastify";
import type { RawData } from "ws";
import { JwtService } from "../../services/jwt.service.js";
import { ClientRealtimeMessage, ServerRealtimeMessage } from "./realtime.types.js";
import { realtimeService } from "./realtime.service.js";

export async function realtimeRoutes(app: FastifyInstance) {
  const jwtService = new JwtService();

  // Register broadcaster
  realtimeService.startRuntimeStatusBroadcast(app);

  // Stop broadcaster on app close
  app.addHook("onClose", async () => {
    realtimeService.stopRuntimeStatusBroadcast();
  });

  app.get(
    "/realtime/ws",
    { websocket: true },
    (socket, request) => {
      const query = request.query as Record<string, string> | undefined;
      const token = query?.token;

      if (!token) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Unauthorized",
          } satisfies ServerRealtimeMessage)
        );
        socket.close();
        return;
      }

      let userId: string;
      try {
        const payload = jwtService.verifyAccessToken(token);
        userId = payload.userId;
      } catch (error) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Unauthorized",
          } satisfies ServerRealtimeMessage)
        );
        socket.close();
        return;
      }

      // When socket connects: add client to realtimeService, store clientId
      const client = realtimeService.addClient(userId, socket);
      const clientId = client.id;

      // On connection: log userId connected & performance stats
      app.log.info({ userId, clientId }, "realtime client connected");
      realtimeService.logPerformanceStats(app);

      // Handle messages
      socket.on("message", async (rawMessage: RawData) => {
        let parsed: any;
        try {
          parsed = JSON.parse(rawMessage.toString());
        } catch (error) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            } satisfies ServerRealtimeMessage)
          );
          return;
        }

        try {
          if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Invalid message format",
              } satisfies ServerRealtimeMessage)
            );
            return;
          }

          // On message: update client.lastSeenAt
          const currentClient = realtimeService.getClient(clientId);
          if (currentClient) {
            currentClient.lastSeenAt = new Date();
          }

          const message = parsed as ClientRealtimeMessage;

          if (message.type === "ping") {
            socket.send(
              JSON.stringify({
                type: "pong",
                ts: Date.now(),
              } satisfies ServerRealtimeMessage)
            );
          } else if (message.type === "subscribe_strategy") {
            const { strategyId } = message;

            // Verify strategy belongs to user before subscribing
            const strategy = await app.db.strategy.findFirst({
              where: {
                id: strategyId,
                userId,
              },
            });

            if (!strategy) {
              socket.send(
                JSON.stringify({
                  type: "error",
                  message: "Strategy not found",
                } satisfies ServerRealtimeMessage)
              );
              return;
            }

            realtimeService.subscribeStrategy(clientId, strategyId);

            // On subscribe: log userId, strategyId & performance stats
            app.log.info({ userId, strategyId }, "User subscribed to strategy");
            realtimeService.logPerformanceStats(app);

            socket.send(
              JSON.stringify({
                type: "subscribed_strategy",
                strategyId,
              } satisfies ServerRealtimeMessage)
            );
          } else if (message.type === "unsubscribe_strategy") {
            const { strategyId } = message;

            realtimeService.unsubscribeStrategy(clientId, strategyId);

            // On unsubscribe: log userId, strategyId & performance stats
            app.log.info({ userId, strategyId }, "User unsubscribed from strategy");
            realtimeService.logPerformanceStats(app);

            socket.send(
              JSON.stringify({
                type: "unsubscribed_strategy",
                strategyId,
              } satisfies ServerRealtimeMessage)
            );
          } else {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Unknown message type",
              } satisfies ServerRealtimeMessage)
            );
          }
        } catch (error) {
          app.log.error({ error }, "Error handling websocket message");
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Internal server error occurred",
            } satisfies ServerRealtimeMessage)
          );
        }
      });

      // Cleanup
      // On socket close: log that realtime client disconnected & performance stats
      socket.on("close", () => {
        app.log.info({ userId, clientId }, "realtime client disconnected");
        realtimeService.removeClient(clientId);
        realtimeService.logPerformanceStats(app);
      });
    }
  );
}

