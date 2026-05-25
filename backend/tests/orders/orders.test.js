const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const { createTestUser, registerAdmin, createTestProduct } = require('../utils/factories');
const Order = require('../../models/Order');

describe('Order API Tests', () => {
  let adminToken, userToken, adminUser, regularUser;
  let testProduct;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    // Create users
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

    // Create a test product with stock
    testProduct = await createTestProduct({
      name: 'Order Test Product',
      price: 25.00,
      stock: 100,
    });
  });

  afterEach(async () => {
    await clearTestDB();
  });

  // ==========================================
  // POST /api/orders
  // ==========================================
  describe('POST /api/orders', () => {
    it('should create an order successfully', async () => {
      const orderData = {
        orderItems: [
          {
            product: testProduct._id.toString(),
            name: testProduct.name,
            quantity: 2,
            price: testProduct.price,
            imageUrl: '',
          },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'India',
        },
        paymentMethod: 'Mock',
        totalPrice: 50.00,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('orderItems');
      expect(res.body.orderItems).toHaveLength(1);
      // Recalculated total: 50 (items) + 10 (shipping) + 2.5 (5% tax) = 62.50
      expect(res.body).toHaveProperty('totalPrice', 62.5);
      expect(res.body).toHaveProperty('status', 'Pending');
      expect(res.body).toHaveProperty('isPaid', false);
    });

    it('should reject order with empty items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 0,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'No order items');
    });

    it('should reject order without authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reduce product stock after order creation', async () => {
      const Product = require('../../models/Product');

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 3,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 75.00,
        });

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.stock).toBe(97); // 100 - 3
    });

    it('should reject order when product is out of stock', async () => {
      const Product = require('../../models/Product');
      const outOfStockProduct = await createTestProduct({
        name: 'Out of Stock Product',
        price: 10,
        stock: 0,
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: outOfStockProduct._id.toString(),
              name: outOfStockProduct.name,
              quantity: 1,
              price: outOfStockProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 10.00,
        });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================
  // GET /api/orders/myorders
  // ==========================================
  describe('GET /api/orders/myorders', () => {
    it('should fetch orders for the logged-in user', async () => {
      // Create an order first
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      // Recalculated total: 25 (item) + 10 (shipping) + 1.25 (5% tax) = 36.25
      expect(res.body[0]).toHaveProperty('totalPrice', 36.25);
    });

    it('should return empty array if user has no orders', async () => {
      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should not return other users\' orders', async () => {
      // Create order with regular user
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      // Check admin sees no orders (admin hasn't placed any)
      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  // ==========================================
  // GET /api/orders/:id
  // ==========================================
  describe('GET /api/orders/:id', () => {
    it('should fetch order by ID for the order owner', async () => {
      // Create an order
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      const orderId = createRes.body._id;

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id', orderId);
    });

    it('should allow admin to fetch any order', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      const orderId = createRes.body._id;

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id', orderId);
    });

    it('should return 404 for non-existent order', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ==========================================
  // GET /api/orders (Admin Only)
  // ==========================================
  describe('GET /api/orders (Admin)', () => {
    it('should fetch all orders as admin', async () => {
      // Create an order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject fetching all orders by non-admin', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================
  // PUT /api/orders/:id/status (Admin Only)
  // ==========================================
  describe('PUT /api/orders/:id/status', () => {
    it('should update order status as admin', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      const orderId = createRes.body._id;

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipped' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'Shipped');
    });

    it('should set isDelivered when status is Delivered', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            {
              product: testProduct._id.toString(),
              name: testProduct.name,
              quantity: 1,
              price: testProduct.price,
            },
          ],
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
            country: 'India',
          },
          paymentMethod: 'Mock',
          totalPrice: 25.00,
        });

      const orderId = createRes.body._id;

      // Pending -> Shipped
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipped' });

      // Shipped -> Delivered
      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'Delivered');
      expect(res.body).toHaveProperty('isDelivered', true);
      expect(res.body).toHaveProperty('deliveredAt');
    });
  });
});
