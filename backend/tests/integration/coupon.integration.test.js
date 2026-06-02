const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const Coupon = require('../../models/Coupon');
const { registerUser, registerAdmin } = require('../utils/factories');

describe('Coupon Integration Tests', () => {
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

  describe('Coupon Management (Admin Routes)', () => {
    it('should let admin create and get coupons', async () => {
      const payload = {
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 50,
        maxDiscount: 20,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 100
      };

      // Create
      const resCreate = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(resCreate.statusCode).toBe(201);
      expect(resCreate.body.code).toBe('SAVE10');

      // Get All
      const resGet = await request(app)
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resGet.statusCode).toBe(200);
      expect(resGet.body.length).toBe(1);
      expect(resGet.body[0].code).toBe('SAVE10');
    });

    it('should reject creating duplicate coupon codes', async () => {
      await Coupon.create({
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 50,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 100
      });

      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'save10',
          discountType: 'fixed',
          discountValue: 5,
          minOrderAmount: 10,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          usageLimit: 10
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Coupon code already exists');
    });

    it('should block regular users from accessing coupon management', async () => {
      const resGet = await request(app)
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${userToken}`);
      expect(resGet.statusCode).toBe(403);

      const resCreate = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'FAIL' });
      expect(resCreate.statusCode).toBe(403);
    });

    it('should let admin update a coupon', async () => {
      const coupon = await Coupon.create({
        code: 'UPDATE50',
        discountType: 'percentage',
        discountValue: 50,
        minOrderAmount: 10,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 10
      });

      const res = await request(app)
        .put(`/api/admin/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountValue: 40 });

      expect(res.statusCode).toBe(200);
      expect(res.body.discountValue).toBe(40);
    });

    it('should return 404 when updating non-existent coupon', async () => {
      const res = await request(app)
        .put('/api/admin/coupons/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountValue: 40 });
      expect(res.statusCode).toBe(404);
    });

    it('should let admin delete a coupon', async () => {
      const coupon = await Coupon.create({
        code: 'DEL20',
        discountType: 'fixed',
        discountValue: 20,
        minOrderAmount: 10,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 10
      });

      const res = await request(app)
        .delete(`/api/admin/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Coupon deleted');

      const dbCheck = await Coupon.findById(coupon._id);
      expect(dbCheck).toBeNull();
    });

    it('should return 404 when deleting non-existent coupon', async () => {
      const res = await request(app)
        .delete('/api/admin/coupons/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Apply Coupon', () => {
    it('should apply percentage discount correctly and handle maxDiscount limit', async () => {
      const coupon = await Coupon.create({
        code: 'SAVE25',
        discountType: 'percentage',
        discountValue: 25,
        minOrderAmount: 100,
        maxDiscount: 30,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 10
      });

      // Under max limit ($120 * 25% = $30 discount)
      const res1 = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'save25', cartAmount: 120 });

      expect(res1.statusCode).toBe(200);
      expect(res1.body.discount).toBe(30);

      // Over max limit ($200 * 25% = $50 -> capped at $30)
      const res2 = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'SAVE25', cartAmount: 200 });

      expect(res2.statusCode).toBe(200);
      expect(res2.body.discount).toBe(30);
    });

    it('should apply fixed discount correctly', async () => {
      await Coupon.create({
        code: 'SAVE15',
        discountType: 'fixed',
        discountValue: 15,
        minOrderAmount: 50,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 10
      });

      const res = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'SAVE15', cartAmount: 60 });

      expect(res.statusCode).toBe(200);
      expect(res.body.discount).toBe(15);
    });

    it('should reject inactive or invalid coupon codes', async () => {
      await Coupon.create({
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 10,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 10,
        isActive: false
      });

      const res = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'SAVE10', cartAmount: 20 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid or inactive coupon code');
    });

    it('should reject expired coupons', async () => {
      await Coupon.create({
        code: 'EXPIRED',
        discountType: 'fixed',
        discountValue: 10,
        minOrderAmount: 10,
        expiryDate: new Date(Date.now() - 1000), // In the past
        usageLimit: 10
      });

      const res = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'EXPIRED', cartAmount: 20 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Coupon has expired');
    });

    it('should reject coupon if usage limit has been reached', async () => {
      await Coupon.create({
        code: 'LIMIT',
        discountType: 'fixed',
        discountValue: 10,
        minOrderAmount: 10,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 5,
        usedCount: 5
      });

      const res = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'LIMIT', cartAmount: 20 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Coupon usage limit reached');
    });

    it('should reject coupon if cart amount is below minimum order amount', async () => {
      await Coupon.create({
        code: 'HIGHMIN',
        discountType: 'fixed',
        discountValue: 10,
        minOrderAmount: 100,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 5
      });

      const res = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'HIGHMIN', cartAmount: 50 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Minimum order of $100 required');
    });
  });

  describe('Coupon Controller Error Simulation', () => {
    it('should return 500 when database errors on fetch', async () => {
      const originalFind = Coupon.find;
      Coupon.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB read error'))
      });

      const res = await request(app)
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      Coupon.find = originalFind;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('DB read error');
    });

    it('should return 500 when database errors on create', async () => {
      const originalFindOne = Coupon.findOne;
      Coupon.findOne = jest.fn().mockRejectedValue(new Error('DB create error'));

      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DBERR',
          discountType: 'percentage',
          discountValue: 10,
          expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          usageLimit: 5
        });

      Coupon.findOne = originalFindOne;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('DB create error');
    });

    it('should return 500 when database errors on update', async () => {
      const originalFindById = Coupon.findById;
      Coupon.findById = jest.fn().mockRejectedValue(new Error('DB update error'));

      const res = await request(app)
        .put('/api/admin/coupons/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountValue: 20 });

      Coupon.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('DB update error');
    });

    it('should return 500 when database errors on delete', async () => {
      const originalFindById = Coupon.findById;
      Coupon.findById = jest.fn().mockRejectedValue(new Error('DB delete error'));

      const res = await request(app)
        .delete('/api/admin/coupons/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      Coupon.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('DB delete error');
    });

    it('should return 500 when database errors on apply', async () => {
      const originalFindOne = Coupon.findOne;
      Coupon.findOne = jest.fn().mockRejectedValue(new Error('DB apply error'));

      const res = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ code: 'DBERR', cartAmount: 100 });

      Coupon.findOne = originalFindOne;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('DB apply error');
    });
  });
});
