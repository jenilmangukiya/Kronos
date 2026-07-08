export type ClientRealtimeMessage =
  | {
      type: "ping";
    };

export type ServerRealtimeMessage =
  | {
      type: "pong";
      ts: number;
    }
  | {
      type: "error";
      message: string;
    };
