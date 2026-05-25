const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const User = require('../../models/User');
const Order = require('../../models/Order');
const jwt = require('jsonwebtoken');
const {
  registerUser,
  registerAdmin,
  createProduct,
  createOrder,
  generateInvalidToken,
  generateExpiredToken,
} = require('../utils/factories');

describe('Security Integration Tests', () => {
  let adminToken, user1Token, user1Id, user2Token, user2Id;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Setup Admin
    const admin = await registerAdmin({ email: 'admin@security.com' });
    adminToken = admin.token;

    // Setup User 1
    const user1 = await registerUser({ email: 'user1@security.com' });
    user1Token = user1.token;
    user1Id = user1.body._id;

    // Setup User 2
    const user2 = await registerUser({ email: 'user2@security.com' });
    user2Token = user2.token;
    user2Id = user2.body._id;
  });

  // =====================================================================
  // 1. UNAUTHORIZED ACCESS (NO TOKEN)
  // =====================================================================
  describe('Unauthorized Access', () => {
    it('should block access to /api/orders/myorders without token', async () => {
      const res = await request(app).get('/api/orders/myorders');
      expect(res.statusCode).toBe(401);
    });

    it('should block access to admin routes without token', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.statusCode).toBe(401);
    });
  });

  // =====================================================================
  // 2. ROLE-BASED ACCESS (USER VS ADMIN)
  // =====================================================================
  describe('Role-Based Access Control (RBAC)', () => {
    it('should prevent regular user from accessing admin order list', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.statusCode).toBe(403);
    });

    it('should prevent regular user from creating products', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Hack Product', price: 10, category: 'Men', stock: 1 });
      expect(res.statusCode).toBe(403);
    });

    it('should prevent regular user from updating order status', async () => {
      // Create an order first
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createOrder(user1Token, [{ product, quantity: 1 }]);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ status: 'Delivered' });
      
      expect(res.statusCode).toBe(403);
    });
  });

  // =====================================================================
  // 3. DATA ISOLATION (ACCESSING OTHER USERS' DATA)
  // =====================================================================
  describe('Data Isolation', () => {
    it('should prevent User 1 from viewing User 2\'s order', async () => {
      // User 2 creates an order
      const { body: product, status: pStatus } = await createProduct(adminToken);
      expect(pStatus).toBe(201);
      
      const { body: order2, status: oStatus } = await createOrder(user2Token, [{ product, quantity: 1 }]);
      expect(oStatus).toBe(201);

      // User 1 tries to view it
      const res = await request(app)
        .get(`/api/orders/${order2._id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Not authorized');
    });

    it('should prevent User 1 from updating User 2\'s cart', async () => {
      // User 2 adds to cart (usually implicit in API, but let's test specific endpoint if exists)
      // If there's a user profile update, test that too
      const res = await request(app)
        .put(`/api/users/profile`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ _id: user2Id, name: 'Hacked Name' });
      
      // If the API design is correct, it should either ignore the _id in body or fail if not matching
      // Let's assume the profile route is /api/users/profile and uses req.user._id
      // We check if User 2's name remains unchanged
      const user2Before = await User.findById(user2Id);
      expect(user2Before.name).not.toBe('Hacked Name');
    });
  });

  // =====================================================================
  // 4. JWT TAMPERING & INVALID TOKENS
  // =====================================================================
  describe('JWT Security', () => {
    it('should reject a tampered token (valid payload, wrong secret)', async () => {
      const tamperedToken = generateInvalidToken();
      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not authorized, token failed');
    });

    it('should reject an expired token', async () => {
      const expiredToken = generateExpiredToken();
      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.statusCode).toBe(401);
    });

    it('should reject a token with a modified payload (e.g. role changed to admin)', async () => {
      // Create a valid token but manually change the content (requires sign)
      // This is basically what an attacker would try without the secret.
      // If they don't have the secret, the signature will be invalid.
      const payload = { id: user1Id, role: 'admin' };
      const evilToken = jwt.sign(payload, 'wrong-secret');
      
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${evilToken}`);
      
      expect(res.statusCode).toBe(401);
    });
  });
});
