const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const { createTestUser, registerAdmin, createTestProduct } = require('../utils/factories');

describe('Product API Tests', () => {
  let adminToken, userToken, adminUser, regularUser;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // Create an admin and a regular user for each test
    const admin = await registerAdmin({
      email: `admin_${Date.now()}@test.com`,
    });
    adminToken = admin.token;
    adminUser = admin.body;

    const user = await createTestUser({
      email: `user_${Date.now()}@test.com`,
    });
    userToken = user.token;
    regularUser = user.body;
  });

  afterEach(async () => {
    await clearTestDB();
  });

  // ==========================================
  // GET /api/products
  // ==========================================
  describe('GET /api/products', () => {
    it('should fetch all products (public)', async () => {
      // Seed some products
      await createTestProduct({ name: 'Product A', price: 10 });
      await createTestProduct({ name: 'Product B', price: 20 });
      await createTestProduct({ name: 'Product C', price: 30 });

      const res = await request(app).get('/api/products');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body.products).toHaveLength(3);
      expect(res.body).toHaveProperty('total', 3);
    });

    it('should return empty array when no products exist', async () => {
      const res = await request(app).get('/api/products');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body.products).toHaveLength(0);
      expect(res.body).toHaveProperty('total', 0);
    });

    it('should support keyword search', async () => {
      await createTestProduct({ name: 'Blue Shirt' });
      await createTestProduct({ name: 'Red Pants' });
      await createTestProduct({ name: 'Blue Jeans' });

      const res = await request(app).get('/api/products?keyword=Blue');

      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should support category filter', async () => {
      await createTestProduct({ name: 'Men Shirt', category: 'Men' });
      await createTestProduct({ name: 'Women Dress', category: 'Women' });

      const res = await request(app).get('/api/products?category=Men');

      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe('Men Shirt');
    });

    it('should support price range filter', async () => {
      await createTestProduct({ name: 'Cheap', price: 10 });
      await createTestProduct({ name: 'Mid', price: 50 });
      await createTestProduct({ name: 'Expensive', price: 200 });

      const res = await request(app).get('/api/products?minPrice=20&maxPrice=100');

      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe('Mid');
    });

    it('should support pagination', async () => {
      // Create 5 products
      for (let i = 1; i <= 5; i++) {
        await createTestProduct({ name: `Product ${i}`, price: i * 10 });
      }

      const res = await request(app).get('/api/products?page=1&limit=2');

      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(2);
      expect(res.body.page).toBe(1);
      expect(res.body.pages).toBe(3);
      expect(res.body.total).toBe(5);
    });
  });

  // ==========================================
  // GET /api/products/:id
  // ==========================================
  describe('GET /api/products/:id', () => {
    it('should fetch a single product by ID', async () => {
      const product = await createTestProduct({ name: 'Single Product' });

      const res = await request(app).get(`/api/products/${product._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'Single Product');
      expect(res.body).toHaveProperty('_id', product._id.toString());
    });

    it('should return 404 for non-existent product', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app).get(`/api/products/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });
  });

  // ==========================================
  // POST /api/products (Admin Only)
  // ==========================================
  describe('POST /api/products', () => {
    it('should create a product as admin', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Product',
          price: 49.99,
          description: 'A fantastic product',
          category: 'Men',
          stock: 50,
          brand: 'TestBrand',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('name', 'New Product');
      expect(res.body).toHaveProperty('price', 49.99);
      expect(res.body).toHaveProperty('category', 'Men');
      expect(res.body).toHaveProperty('stock', 50);
    });

    it('should reject product creation without auth', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          name: 'No Auth Product',
          price: 10,
          description: 'Test',
          category: 'Men',
          stock: 5,
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject product creation by regular user', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'User Product',
          price: 10,
          description: 'Test',
          category: 'Men',
          stock: 5,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('message', 'Not authorized as an admin');
    });
  });

  // ==========================================
  // PUT /api/products/:id (Admin Only)
  // ==========================================
  describe('PUT /api/products/:id', () => {
    it('should update a product as admin', async () => {
      const product = await createTestProduct();

      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product',
          price: 99.99,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Product');
      expect(res.body).toHaveProperty('price', 99.99);
    });

    it('should return 404 when updating non-existent product', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Product' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==========================================
  // DELETE /api/products/:id (Admin Only)
  // ==========================================
  describe('DELETE /api/products/:id', () => {
    it('should delete a product as admin', async () => {
      const product = await createTestProduct();

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Product removed');
    });

    it('should return 404 when deleting non-existent product', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should reject deletion by non-admin user', async () => {
      const product = await createTestProduct();

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================
  // POST /api/products/bulk (Admin Only)
  // ==========================================
  describe('POST /api/products/bulk', () => {
    it('should bulk upload products as admin', async () => {
      const res = await request(app)
        .post('/api/products/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          products: [
            { name: 'Bulk 1', price: 10, description: 'Desc 1', category: 'Men', stock: 5, brand: 'X' },
            { name: 'Bulk 2', price: 20, description: 'Desc 2', category: 'Women', stock: 10, brand: 'Y' },
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('products');
      expect(res.body.products).toHaveLength(2);
    });

    it('should reject bulk upload without products array', async () => {
      const res = await request(app)
        .post('/api/products/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'No products provided');
    });
  });
});
