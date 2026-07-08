import { FastifyInstance } from "fastify";
import type { RawData } from "ws";
import { JwtService } from "../../services/jwt.service.js";
import { ClientRealtimeMessage, ServerRealtimeMessage } from "./realtime.types.js";

export async function realtimeRoutes(app: FastifyInstance) {
  const jwtService = new JwtService();

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

      // On connection: log userId connected
      app.log.info({ userId }, "realtime client connected");

      // Handle messages
      socket.on("message", (rawMessage: RawData) => {
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

        if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            } satisfies ServerRealtimeMessage)
          );
          return;
        }

        const message = parsed as ClientRealtimeMessage;

        if (message.type === "ping") {
          socket.send(
            JSON.stringify({
              type: "pong",
              ts: Date.now(),
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
      });

      // Cleanup
      // On socket close: log that realtime client disconnected
      socket.on("close", () => {
        app.log.info({ userId }, "realtime client disconnected");
      });
    }
  );
}
