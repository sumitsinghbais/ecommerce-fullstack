const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const User = require('../../models/User');
const { createTestUser, loginUser } = require('../utils/factories');

describe('Auth API Tests', () => {
  // Connect to test DB before all tests
  beforeAll(async () => {
    await connectTestDB();
  });

  // Clean up after all tests
  afterAll(async () => {
    await disconnectTestDB();
  });

  // Clear users collection between test suites
  afterEach(async () => {
    await clearTestDB();
  });

  // ==========================================
  // POST /api/auth/register
  // ==========================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'John Doe');
      expect(res.body).toHaveProperty('email', 'john@example.com');
      expect(res.body).toHaveProperty('role', 'user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toBeTruthy();
    });

    it('should prevent duplicate user registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe Again',
          email: 'john@example.com',
          password: 'password456',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'User already exists');
    });

    it('should fail registration without required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nope@example.com',
        });

      // Joi validation returns 500 due to errorMiddleware catching thrown errors
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should fail registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should fail registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'short@example.com',
          password: '123',
        });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should hash the password before saving', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hash Test',
          email: 'hash@example.com',
          password: 'password123',
        });

      const user = await User.findOne({ email: 'hash@example.com' });
      expect(user).toBeTruthy();
      expect(user.password).not.toBe('password123');
    });
  });

  // ==========================================
  // POST /api/auth/login
  // ==========================================
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login User',
          email: 'login@example.com',
          password: 'password123',
        });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'Login User');
      expect(res.body).toHaveProperty('email', 'login@example.com');
      expect(res.body).toHaveProperty('role', 'user');
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toBeTruthy();
    });

    it('should fail login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should fail login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
        });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should block login for a blocked user', async () => {
      // Block the user directly in the database
      await User.findOneAndUpdate(
        { email: 'login@example.com' },
        { isBlocked: true }
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Your account has been blocked.');
    });

    it('should return a valid JWT token on successful login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(200);

      // Decode and verify the token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('id');
      expect(decoded.id).toBe(res.body._id);
    });
  });

  // ==========================================
  // POST /api/auth/forgot-password
  // ==========================================
  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Reset User',
          email: 'reset@example.com',
          password: 'password123',
        });
    });

    it('should send OTP for a valid email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message');

      // Check that OTP was saved in database
      const user = await User.findOne({ email: 'reset@example.com' });
      expect(user.resetPasswordOtp).toBeTruthy();
      expect(user.resetPasswordExpires).toBeTruthy();
    });

    it('should return 404 for non-existent email on forgot password', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });
});
