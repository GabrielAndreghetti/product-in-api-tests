import request from "supertest";
import { getRepository } from "typeorm";
import { CampaignController } from "../controllers/CampaignController";
import { Campaign } from "../entities/Campaign";
import { Product } from "../entities/Product";
import { CampaignProduct } from "../entities/CampaignProduct";
import axios from "axios";


// Mock do axios
jest.mock("axios");
jest.mock("typeorm", () => ({
  getRepository: jest.fn(),
}));

describe("CampaignController", () => {
  describe("getAll", () => {
    it("deve retornar todas as campanhas com seus produtos", async () => {
      const mockCampaigns = [
        {
          id: 1,
          name: "Campanha 1",
          campaignProducts: [{ product: { name: "Produto 1" } }],
        },
      ];

      (getRepository as jest.Mock).mockReturnValue({
        find: jest.fn().mockResolvedValue(mockCampaigns),
      });

      const res = await request(app).get("/campaigns");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe("Campanha 1");
      expect(res.body[0].campaignProducts[0].product.name).toBe("Produto 1");
    });
  });

  describe("getAllNames", () => {
    it("deve retornar os nomes das campanhas", async () => {
      const mockNames = [
        { id: 1, name: "Campanha 1" },
        { id: 2, name: "Campanha 2" },
      ];

      (getRepository as jest.Mock).mockReturnValue({
        find: jest.fn().mockResolvedValue(mockNames),
      });

      const res = await request(app).get("/campaigns/names");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].name).toBe("Campanha 1");
    });
  });

  describe("getDashboardData", () => {
    it("deve retornar os dados agregados da campanha", async () => {
      const mockCampaign = {
        id: 1,
        name: "Campanha 1",
        campaignProducts: [
          { product: { name: "Produto 1", weight_type: "kg", weight_value: 2 }, quantity: 3 },
        ],
      };

      (getRepository as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockCampaign),
      });

      const res = await request(app).get("/campaigns/dashboard?campaignId=1");

      expect(res.status).toBe(200);
      expect(res.body.total_products).toBe(1);
      expect(res.body.total_weight).toBe(6); // 2kg * 3
      expect(res.body.products[0].name).toBe("Produto 1");
    });

    it("deve retornar 404 se a campanha não for encontrada", async () => {
      (getRepository as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).get("/campaigns/dashboard?campaignId=99");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Campanha não encontrada.");
    });
  });

  describe("addProductToCampaign", () => {
    it("deve associar um produto existente à campanha", async () => {
      const mockCampaign = { id: 1, name: "Campanha 1" };
      const mockProduct = { id: 1, codebar: "12345", name: "Produto 1" };
      const mockCampaignProduct = { id: 1, campaign: mockCampaign, product: mockProduct, quantity: 5 };

      (getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === Campaign) {
          return { findOne: jest.fn().mockResolvedValue(mockCampaign) };
        }
        if (entity === Product) {
          return { findOne: jest.fn().mockResolvedValue(mockProduct) };
        }
        if (entity === CampaignProduct) {
          return {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockReturnValue(mockCampaignProduct),
            save: jest.fn().mockResolvedValue(mockCampaignProduct),
          };
        }
      });

      const res = await request(app)
        .post("/campaigns/1/products")
        .send({ codebar: "12345", quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(5);
    });

    it("deve buscar o produto na API externa se não existir no banco", async () => {
      const mockCampaign = { id: 1, name: "Campanha 1" };
      const mockApiProduct = {
        _id: "54321",
        product_name: "Produto API",
        product_quantity: "100",
        product_quantity_unit: "g",
      };

      const mockCampaignProduct = { id: 1, campaign: mockCampaign, quantity: 5 };

      (getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === Campaign) {
          return { findOne: jest.fn().mockResolvedValue(mockCampaign) };
        }
        if (entity === Product) {
          return {
            findOne: jest.fn().mockResolvedValue(null), // Produto não encontrado no banco
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
          };
        }
        if (entity === CampaignProduct) {
          return { create: jest.fn(), save: jest.fn().mockResolvedValue(mockCampaignProduct) };
        }
      });

      (axios.get as jest.Mock).mockResolvedValue({ data: { product: mockApiProduct } });

      const res = await request(app)
        .post("/campaigns/1/products")
        .send({ codebar: "54321", quantity: 5 });

      expect(res.status).toBe(200);
      expect(axios.get).toHaveBeenCalledWith("https://world.openfoodfacts.org/api/v0/product/54321");
      expect(res.body.quantity).toBe(5);
    });
  });
});
