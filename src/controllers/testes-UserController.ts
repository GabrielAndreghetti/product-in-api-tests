import request from 'supertest';
import { createConnection, getConnection } from 'typeorm';
import bcrypt from '../utils/bcrypt'; // Mockando para controlar os hashes de senhas
import { User } from '../entities/User';
import app from '../app'; 

jest.mock('../utils/bcrypt'); // Mock para controlar a função de hash

describe('UserController', () => {
  // Conectar ao banco de dados antes de todos os testes
  beforeAll(async () => {
    await createConnection();
  });

  // Fechar a conexão após todos os testes
  afterAll(async () => {
    const conn = getConnection();
    await conn.close();
  });

  // Limpar dados entre os testes para evitar interferências
  beforeEach(async () => {
    const userRepository = getConnection().getRepository(User);
    await userRepository.clear();
  });

  // Teste para listar todos os usuários
  it('should list all users', async () => {
    const userRepository = getConnection().getRepository(User);
    
    // Inserir usuários de teste
    await userRepository.save([
      { email: 'user1@test.com', password: 'password1' },
      { email: 'user2@test.com', password: 'password2' },
    ]);

    const response = await request(app).get('/users');
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2); // Verifica se retornou 2 usuários
    expect(response.body[0].email).toBe('user1@test.com');
    expect(response.body[1].email).toBe('user2@test.com');
  });

  // Teste para criar um novo usuário com senha criptografada
  it('should create a new user with hashed password', async () => {
    const userRepository = getConnection().getRepository(User);
    
    const newUser = {
      email: 'newuser@test.com',
      password: 'plaintextpassword',
    };

    // Mock da função de hash para retornar um valor fixo
    (bcrypt.hashPassword as jest.Mock).mockResolvedValue('hashedpassword123');

    const response = await request(app)
      .post('/users')
      .send(newUser);

    expect(response.status).toBe(201);
    const savedUser = await userRepository.findOne({ where: { email: newUser.email } });

    expect(savedUser).toBeTruthy();
    expect(savedUser?.password).toBe('hashedpassword123'); // Verifica se a senha foi criptografada
  });

  // Teste para evitar criação de usuário com e-mail duplicado
  it('should not create user if email already exists', async () => {
    const userRepository = getConnection().getRepository(User);

    // Inserir um usuário com e-mail de teste
    await userRepository.save({
      email: 'duplicate@test.com',
      password: 'password',
    });

    const newUser = {
      email: 'duplicate@test.com', // Mesmo e-mail
      password: 'newpassword',
    };

    const response = await request(app)
      .post('/users')
      .send(newUser);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('e-mail alredy existis');
  });

  // Teste para tratar erro na criação de usuário
  it('should return 500 if there is an error during user creation', async () => {
    // Mock de um erro na função de hash
    (bcrypt.hashPassword as jest.Mock).mockRejectedValue(new Error('Hash error'));

    const newUser = {
      email: 'erroruser@test.com',
      password: 'password',
    };

    const response = await request(app)
      .post('/users')
      .send(newUser);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Error creating user');
  });
});
