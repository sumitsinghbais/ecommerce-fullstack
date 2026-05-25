const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const User = require('../../models/User');
const nodemailer = require('nodemailer');
const { registerUser, registerAdmin, createProduct, createTestOrder, DEFAULT_SHIPPING } = require('../utils/factories');

describe('Failure Simulation & Data Consistency Tests', () => {
  let adminToken, userToken, saveSpy;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    // Clear everything and disconnect
    await clearTestDB();
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const admin = await registerAdmin();
    adminToken = admin.token;
    const user = await registerUser({ email: 'failure@test.com' });
    userToken = user.token;
  });

  afterEach(() => {
    if (saveSpy) {
      saveSpy.mockRestore();
      saveSpy = null;
    }
  });

  // =====================================================================
  // 1. EMAIL SENDING FAILURE
  // =====================================================================
  describe('Email Failure Simulation', () => {
    it('should handle nodemailer failure gracefully during forgot password', async () => {
      // Mock nodemailer sendMail to reject
      const mockTransporter = require('nodemailer').createTransport();
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'failure@test.com' });

      // Our controller catches it and still returns 200 (message: if valid...) 
      // but logs it. We verify it doesn't crash the server.
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('receive an OTP shortly');
    });
  });

  // =====================================================================
  // 2. ATOMIC OPERATIONS (TRANSACTIONS)
  // =====================================================================
  describe('Data Consistency (Atomicity)', () => {
    it('should NOT reduce stock if order creation fails (atomic rollback)', async () => {
      // Create a product with stock 10
      const { body: product } = await createProduct(adminToken, { stock: 10 });

      // Mock save to fail
      saveSpy = jest.spyOn(require('../../models/Order').prototype, 'save').mockRejectedValueOnce(new Error('Database Save Failed'));

      const orderData = {
        orderItems: [
          { product: product._id, name: product.name, quantity: 5, price: product.price }
        ],
        shippingAddress: { ...DEFAULT_SHIPPING },
        paymentMethod: 'Mock',
        totalPrice: product.price * 5
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.statusCode).toBe(500);
      
      // Stock should be 10 if rollback worked, but 5 if it didn't.
      const updatedProduct = await Product.findById(product._id);
      
      // NOTE: With standard mongodb-memory-server, real transactions might require replica set config. 
      // Our connectTestDB already specifies replicaSet count 1.
      expect(updatedProduct.stock).toBe(10); 
    });
  });

  // =====================================================================
  // 3. PAYMENT FAILURE SIMULATION
  // =====================================================================
  describe('Payment Failure Simulation', () => {
    it('should handle payment failure response gracefully', async () => {
      // Create an order first
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createTestOrder(userToken, [{ product, quantity: 1 }]);

      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'failed_tr_123',
          status: 'failed',
          update_time: new Date().toISOString(),
          email_address: 'failure@test.com'
        });
      expect(res.statusCode).toBe(200); 
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Payment failed');

      // Verify DB state
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.isPaid).toBe(false);
    });
  });
});
