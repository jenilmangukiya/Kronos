import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AppError } from "../../errors/app-error.js";
import { ReplayService } from "./replay.service.js";
import { StartReplayInput } from "./replay.types.js";

export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  async startReplay(userId: string | undefined, input: StartReplayInput) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    return this.replayService.startReplay(userId, input);
  }

  async stopReplay(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    await this.replayService.stopReplay(userId);
    return { success: true };
  }

  async pauseReplay(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    await this.replayService.pauseReplay(userId);
    return { success: true };
  }

  async resumeReplay(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    await this.replayService.resumeReplay(userId);
    return { success: true };
  }

  async stepReplay(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    await this.replayService.stepReplay(userId);
    return { success: true };
  }

  async getSession(userId: string | undefined) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const session = await this.replayService.getSession(userId);
    if (!session) {
      throw new AppError("No active replay session found", 404, "REPLAY_SESSION_NOT_FOUND");
    }
    return session;
  }

  async fetchHistoricalCandles(
    userId: string | undefined,
    input: { symbol: string; interval: "1m" | "5m"; date: string }
  ) {
    if (!userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    return this.replayService.fetchHistoricalCandles(userId, input);
  }
}

export async function replayRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  const replayService = new ReplayService(app);
  const replayController = new ReplayController(replayService);

  typedApp.post(
    "/replay/start",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Start replay session",
        security: [{ bearerAuth: [] }],
        body: z.object({
          strategyId: z.string().min(1),
          brokerAccountId: z.string().min(1),
          speed: z.number().optional(),
        }),
        response: {
          200: z.any(),
        },
      },
    },
    async (request) => {
      return replayController.startReplay(request.user?.id, request.body);
    },
  );

  typedApp.post(
    "/replay/stop",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Stop replay session",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.any(),
        },
      },
    },
    async (request) => {
      return replayController.stopReplay(request.user?.id);
    },
  );

  typedApp.post(
    "/replay/pause",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Pause replay session",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.any(),
        },
      },
    },
    async (request) => {
      return replayController.pauseReplay(request.user?.id);
    },
  );

  typedApp.post(
    "/replay/resume",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Resume replay session",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.any(),
        },
      },
    },
    async (request) => {
      return replayController.resumeReplay(request.user?.id);
    },
  );

  typedApp.post(
    "/replay/step",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Step replay session",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.any(),
        },
      },
    },
    async (request) => {
      return replayController.stepReplay(request.user?.id);
    },
  );

  typedApp.get(
    "/replay/session",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Get current replay session",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.any(),
        },
      },
    },
    async (request) => {
      return replayController.getSession(request.user?.id);
    },
  );

  typedApp.get(
    "/replay/history",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Replay"],
        summary: "Fetch historical candles for replay",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          symbol: z.string().min(1),
          interval: z.enum(["1m", "5m"]).default("1m"),
          date: z.string().min(1),
        }),
        response: {
          200: z.array(
            z.object({
              time: z.number(),
              open: z.number(),
              high: z.number(),
              low: z.number(),
              close: z.number(),
            })
          ),
        },
      },
    },
    async (request) => {
      return replayController.fetchHistoricalCandles(request.user?.id, request.query);
    },
  );
}

