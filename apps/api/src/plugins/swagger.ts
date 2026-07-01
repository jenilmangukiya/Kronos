import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fp from "fastify-plugin";

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Kronos API",
        description: "API documentation for Kronos algo trading platform",
        version: "1.0.0",
      },
      servers: [
        {
          url: "/",
          description: "Current server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        {
          name: "Health",
          description: "Health check APIs",
        },
        {
          name: "Auth",
          description: "Authentication APIs",
        },
        {
          name: "Broker",
          description: "Broker connection and account APIs",
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
});
