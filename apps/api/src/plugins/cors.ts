import cors from "@fastify/cors";
import fp from "fastify-plugin";

export default fp(async (app) => {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
});
