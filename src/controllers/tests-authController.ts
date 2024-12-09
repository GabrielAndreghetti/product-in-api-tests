import request from "supertest";
import { getRepository } from "typeorm";
import jwt from "jsonwebtoken";
import { AuthController } from "../controllers/AuthController";
import { User } from "../entities/User";
import bcrypt from "../utils/bcrypt";
import { SECRET_KEY } from "../utils/envConfigs";

// Mock do getRepository para simular a busca no banco de dados
jest.mock("typeorm", () => ({
  getRepository: jest.fn(),
}));

// Mock do bcrypt para testar a função de comparação de senhas
jest.mock("../utils/bcrypt", () => ({
  comparePassword: jest.fn(),
}));

describe("AuthController", () => {
  describe("login", () => {
    it("deve retornar 404 se o usuário não for encontrado", async () => {
      // Mock de resposta do repositório
      (getRepository as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "nonexistent@example.com", password: "password123" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Invalid Credentials");
    });

    it("deve retornar 401 se a senha for inválida", async () => {
      const mockUser = { id: 1, email: "user@example.com", password: "hashedPassword" };

      (getRepository as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      (bcrypt.comparePassword as jest.Mock).mockResolvedValue(false);

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "user@example.com", password: "wrongPassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid Credentials");
    });

    it("deve retornar 200 e um token se o login for bem-sucedido", async () => {
      const mockUser = { id: 1, name: "User", email: "user@example.com", password: "hashedPassword" };

      (getRepository as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      (bcrypt.comparePassword as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "user@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Login successful");
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, SECRET_KEY);
      expect(decoded).toHaveProperty("id", mockUser.id);
      expect(decoded).toHaveProperty("email", mockUser.email);
    });
  });

  describe("protected", () => {
    it("deve retornar mensagem de acesso à rota protegida", async () => {
      const token = jwt.sign(
        { id: 1, username: "User", email: "user@example.com" },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .get("/auth/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Acesso concedido à rota protegida");
      expect(res.body.auth).toBe(`Bearer ${token}`);
    });
  });
});
