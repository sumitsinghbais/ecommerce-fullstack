const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const DiscountRule = require('../../models/DiscountRule');
const { registerUser, registerAdmin } = require('../utils/factories');

describe('Discount Rule Integration Tests', () => {
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

  describe('Discount Rule CRUD Operations (Admin)', () => {
    it('should let admin create, fetch, and list rules', async () => {
      const resCreate = await request(app)
        .post('/api/admin/discount-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ minQuantity: 5, discountPercentage: 10 });

      expect(resCreate.statusCode).toBe(201);
      expect(resCreate.body.minQuantity).toBe(5);

      const resList = await request(app)
        .get('/api/admin/discount-rules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resList.statusCode).toBe(200);
      expect(resList.body.length).toBe(1);
      expect(resList.body[0].minQuantity).toBe(5);
    });

    it('should reject creating rule with duplicate minQuantity', async () => {
      await DiscountRule.create({ minQuantity: 5, discountPercentage: 10 });

      const res = await request(app)
        .post('/api/admin/discount-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ minQuantity: 5, discountPercentage: 15 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('A rule for this quantity already exists');
    });

    it('should prevent regular users from creating discount rules', async () => {
      const res = await request(app)
        .post('/api/admin/discount-rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ minQuantity: 10, discountPercentage: 15 });

      expect(res.statusCode).toBe(403);
    });

    it('should let admin update a discount rule', async () => {
      const rule = await DiscountRule.create({ minQuantity: 10, discountPercentage: 15 });

      const res = await request(app)
        .put(`/api/admin/discount-rules/${rule._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountPercentage: 20 });

      expect(res.statusCode).toBe(200);
      expect(res.body.discountPercentage).toBe(20);
    });

    it('should return 404 when updating non-existent rule', async () => {
      const res = await request(app)
        .put('/api/admin/discount-rules/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountPercentage: 20 });

      expect(res.statusCode).toBe(404);
    });

    it('should let admin delete a discount rule', async () => {
      const rule = await DiscountRule.create({ minQuantity: 10, discountPercentage: 15 });

      const res = await request(app)
        .delete(`/api/admin/discount-rules/${rule._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Rule deleted');

      const dbCheck = await DiscountRule.findById(rule._id);
      expect(dbCheck).toBeNull();
    });

    it('should return 404 when deleting non-existent rule', async () => {
      const res = await request(app)
        .delete('/api/admin/discount-rules/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Public Routes for Discount Rules', () => {
    it('should allow anyone to retrieve rules publicly', async () => {
      await DiscountRule.create({ minQuantity: 3, discountPercentage: 5 });

      const res = await request(app).get('/api/coupons/rules');
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].minQuantity).toBe(3);
    });
  });

  describe('Error Simulation', () => {
    it('should handle database errors on get rules and return 500', async () => {
      const originalFind = DiscountRule.find;
      DiscountRule.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database read failure'))
      });

      const res = await request(app)
        .get('/api/admin/discount-rules')
        .set('Authorization', `Bearer ${adminToken}`);

      DiscountRule.find = originalFind;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database read failure');
    });

    it('should handle database errors on create rule and return 500', async () => {
      const originalFindOne = DiscountRule.findOne;
      DiscountRule.findOne = jest.fn().mockRejectedValue(new Error('Database create failure'));

      const res = await request(app)
        .post('/api/admin/discount-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ minQuantity: 5, discountPercentage: 10 });

      DiscountRule.findOne = originalFindOne;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database create failure');
    });

    it('should handle database errors on update rule and return 500', async () => {
      const originalFindById = DiscountRule.findById;
      DiscountRule.findById = jest.fn().mockRejectedValue(new Error('Database update failure'));

      const res = await request(app)
        .put('/api/admin/discount-rules/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountPercentage: 20 });

      DiscountRule.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database update failure');
    });

    it('should handle database errors on delete rule and return 500', async () => {
      const originalFindById = DiscountRule.findById;
      DiscountRule.findById = jest.fn().mockRejectedValue(new Error('Database delete failure'));

      const res = await request(app)
        .delete('/api/admin/discount-rules/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      DiscountRule.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Database delete failure');
    });
  });
});
