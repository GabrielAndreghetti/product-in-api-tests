import { ENVIRONMENT } from "./envConfigs";

const base_url =
  ENVIRONMENT == "production"
    ? "https://product-in-api.onrender.com"
    : "http://localhost:3000";

// Configuração do Swagger
export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "API documentation for ProductIn system",
    },
    servers: [
      {
        url: `${base_url}/api/v0`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT", // Indica o uso do JWT como formato do token
        },
      },
    },
    security: [
      {
        bearerAuth: [], // Aplica o esquema de segurança globalmente
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Especifica onde buscar as anotações para o Swagger
};
