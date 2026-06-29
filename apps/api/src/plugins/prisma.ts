import fp from "fastify-plugin";
import { prisma } from "@kronos/database";

export default fp(async (app) => {
  app.decorate("db", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
