import request from 'supertest';
import { createConnection, getConnection } from 'typeorm';
import { Product } from '../entities/Product';
import app from '../app'; //

describe('ProductController', () => {
  // Conectar ao banco de dados antes de todos os testes
  beforeAll(async () => {
    await createConnection();
  });

  // Fechar a conexão após todos os testes
  afterAll(async () => {
    const conn = getConnection();
    await conn.close();
  });

  // Teste para listar todos os produtos
  it('should list all products', async () => {
    const response = await request(app).get('/products');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true); 
  });

  // Teste para criar um novo produto
  it('should create a new product', async () => {
    const newProduct = {
      name: 'Produto Teste',
      codebar: '1234567890123',
      weight_value: 1.5,
      weight_type: 'kg',
    };

    const response = await request(app)
      .post('/products')
      .send(newProduct);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id'); // Verifica se o produto criado tem um ID
    expect(response.body.name).toBe(newProduct.name);
  });

  // Teste para atualizar um produto existente
  it('should update an existing product', async () => {
    const productToUpdate = await getRepository(Product).save({
      name: 'Produto Antigo',
      codebar: '1111111111111',
      weight_value: 2.0,
      weight_type: 'kg',
    });

    const updatedData = {
      name: 'Produto Atualizado',
    };

    const response = await request(app)
      .put(`/products/${productToUpdate.id}`)
      .send(updatedData);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe(updatedData.name);
  });

  // Teste para deletar um produto
  it('should delete an existing product', async () => {
    const productToDelete = await getRepository(Product).save({
      name: 'Produto a Deletar',
      codebar: '9999999999999',
      weight_value: 1.0,
      weight_type: 'kg',
    });

    const response = await request(app).delete(`/products/${productToDelete.id}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Produto removido com sucesso.');
  });

  // Teste para buscar um produto pelo código de barras
  it('should get a product by codebar', async () => {
    const product = await getRepository(Product).save({
      name: 'Produto Código de Barras',
      codebar: '9876543210123',
      weight_value: 1.2,
      weight_type: 'kg',
    });

    const response = await request(app).get(`/products?codebar=${product.codebar}`);

    expect(response.status).toBe(200);
    expect(response.body.codebar).toBe(product.codebar);
  });

  // Teste para verificar erro na busca por código de barras não existente
  it('should return 404 if product by codebar is not found', async () => {
    const response = await request(app).get('/products?codebar=0000000000000');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Produto não encontrado.');
  });
});
