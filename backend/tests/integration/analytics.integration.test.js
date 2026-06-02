const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const { registerUser, registerAdmin, createProduct, createOrder } = require('../utils/factories');

describe('Analytics Integration Tests', () => {
  let adminToken, userToken;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const admin = await registerAdmin();
    adminToken = admin.token;

    const user = await registerUser();
    userToken = user.token;
  });

  it('should block non-admin users from accessing analytics', async () => {
    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('should block unauthenticated users from accessing analytics', async () => {
    const res = await request(app).get('/api/analytics');
    expect(res.statusCode).toBe(401);
  });

  it('should return 0 revenue and empty sales when no orders exist', async () => {
    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.totalUsers).toBe(2); // Admin and regular user
    expect(res.body.totalProducts).toBe(0);
    expect(res.body.totalOrders).toBe(0);
    expect(res.body.totalRevenue).toBe(0);
    expect(res.body.monthlySales).toEqual([]);
  });

  it('should aggregate revenue and monthly sales correctly', async () => {
    // Create product
    const { body: product } = await createProduct(adminToken, { price: 100 });
    
    // Create paid order
    const order1 = await Order.create({
      user: '507f1f77bcf86cd799439011',
      orderItems: [{ product: product._id, name: product.name, quantity: 1, price: 100 }],
      shippingAddress: { street: '1 St', city: 'City', state: 'State', zipCode: '123', country: 'Country' },
      paymentMethod: 'Stripe',
      totalPrice: 100,
      isPaid: true,
      paidAt: new Date('2026-05-01T12:00:00Z'),
    });

    // Create delivered (but unpaid) order
    const order2 = await Order.create({
      user: '507f1f77bcf86cd799439011',
      orderItems: [{ product: product._id, name: product.name, quantity: 2, price: 100 }],
      shippingAddress: { street: '1 St', city: 'City', state: 'State', zipCode: '123', country: 'Country' },
      paymentMethod: 'Stripe',
      totalPrice: 200,
      isPaid: false,
      status: 'Delivered',
      createdAt: new Date('2026-05-15T12:00:00Z'),
    });

    // Create unpaid, pending order (should not be counted in revenue)
    const order3 = await Order.create({
      user: '507f1f77bcf86cd799439011',
      orderItems: [{ product: product._id, name: product.name, quantity: 1, price: 100 }],
      shippingAddress: { street: '1 St', city: 'City', state: 'State', zipCode: '123', country: 'Country' },
      paymentMethod: 'Stripe',
      totalPrice: 100,
      isPaid: false,
      status: 'Pending',
      createdAt: new Date('2026-05-20T12:00:00Z'),
    });

    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalOrders).toBe(3);
    expect(res.body.totalRevenue).toBe(300); // order1 + order2
    expect(res.body.monthlySales.length).toBe(1);
    expect(res.body.monthlySales[0].revenue).toBe(300);
  });

  it('should handle database errors gracefully and return 500', async () => {
    const originalCount = User.countDocuments;
    User.countDocuments = jest.fn().mockRejectedValue(new Error('Database error simulation'));

    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    User.countDocuments = originalCount; // Restore

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error simulation');
  });
});
