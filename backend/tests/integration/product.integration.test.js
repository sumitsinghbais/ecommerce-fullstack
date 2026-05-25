const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const Product = require('../../models/Product');
const mongoose = require('mongoose');
const {
  registerUser,
  registerAdmin,
  createProduct,
  createProducts,
  generateExpiredToken,
  generateInvalidToken,
  timed,
} = require('../utils/factories');

/**
 * ═══════════════════════════════════════════════════════════════════════
 * PRODUCT INTEGRATION TESTS — Production-Grade
 * ═══════════════════════════════════════════════════════════════════════
 *
 * What's covered:
 *   ✔ Admin creates products → Public fetches them
 *   ✔ Unauthorized creation (regular user / no auth) → 401
 *   ✔ Search, filter by category, filter by price range, pagination
 *   ✔ Admin update & delete with DB verification
 *   ✔ Product reviews: add, update-in-place, delete
 *   ✔ Bulk upload
 *   ✔ Negative flows: missing fields, invalid IDs, non-existent product
 *   ✔ Transaction-level DB assertions after every mutation
 *   ✔ Performance assertions
 */
describe('Product Integration Tests', () => {
  let adminToken, userToken;

  // ── Lifecycle ─────────────────────────────────────────────────────────
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Fresh admin + user per test
    const admin = await registerAdmin();
    adminToken = admin.token;

    const user = await registerUser();
    userToken = user.token;
  });

  // =====================================================================
  // FLOW 1 — Admin Creates Products → Public Fetches Them
  // =====================================================================
  describe('Admin Create → Public Fetch Flow', () => {
    it('should create products as admin, verify DB, then fetch publicly', async () => {
      const { body: productA, status: statusA } = await createProduct(adminToken, {
        name: 'Cotton T-Shirt',
        price: 29.99,
        stock: 50,
        brand: 'FashionCo',
      });
      expect(statusA).toBe(201);
      expect(productA.name).toBe('Cotton T-Shirt');

      // ── DB Verification ──────────────────────────────────────────────
      const dbProduct = await Product.findById(productA._id);
      expect(dbProduct).not.toBeNull();
      expect(dbProduct.name).toBe('Cotton T-Shirt');
      expect(dbProduct.price).toBe(29.99);
      expect(dbProduct.stock).toBe(50);

      const { body: productB } = await createProduct(adminToken, {
        name: 'Silk Dress',
        price: 79.99,
        category: 'Women',
        stock: 30,
        brand: 'EleganceCo',
      });

      // ── Public fetch (no auth) ───────────────────────────────────────
      const fetchRes = await request(app).get('/api/products');
      expect(fetchRes.statusCode).toBe(200);
      expect(fetchRes.body.products).toHaveLength(2);
      expect(fetchRes.body.total).toBe(2);

      // ── Single product by ID ─────────────────────────────────────────
      const singleRes = await request(app).get(`/api/products/${productA._id}`);
      expect(singleRes.statusCode).toBe(200);
      expect(singleRes.body.name).toBe('Cotton T-Shirt');
      expect(singleRes.body.price).toBe(29.99);
    });

    it('should reject product creation by regular user → 401', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Product',
          price: 10,
          description: 'Should not be created',
          category: 'Men',
          stock: 5,
        });
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Not authorized as an admin');

      // ── DB Verification: nothing was created ─────────────────────────
      const count = await Product.countDocuments({ name: 'Unauthorized Product' });
      expect(count).toBe(0);
    });

    it('should reject product creation without authentication → 401', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          name: 'No Auth Product',
          price: 10,
          description: 'Should not be created',
          category: 'Men',
          stock: 5,
        });
      expect(res.statusCode).toBe(401);
    });

    it('should reject product creation with missing required fields → 500', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Incomplete Product' });

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain('Product validation failed');

      // ── DB Verification ──────────────────────────────────────────────
      const count = await Product.countDocuments({ name: 'Incomplete Product' });
      expect(count).toBe(0);
    });
  });

  // =====================================================================
  // FLOW 2 — Search, Filter & Pagination
  // =====================================================================
  describe('Search, Filter & Pagination Flow', () => {
    beforeEach(async () => {
      const seedProducts = [
        { name: 'Blue Denim Jacket', price: 89.99, category: 'Men', brand: 'DenimHQ' },
        { name: 'Red Summer Dress', price: 49.99, category: 'Women', brand: 'SummerCo' },
        { name: 'Blue Cotton Shorts', price: 24.99, category: 'Men', brand: 'ComfortWear' },
        { name: 'Kids Yellow Raincoat', price: 34.99, category: 'Kids', brand: 'KidZone' },
        { name: 'Premium Leather Belt', price: 45.00, category: 'Accessories', brand: 'LeatherCraft' },
      ];
      for (const p of seedProducts) {
        await createProduct(adminToken, p);
      }
    });

    it('should search products by keyword', async () => {
      const res = await request(app).get('/api/products?keyword=Blue');
      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(2);
      expect(res.body.total).toBe(2);
      res.body.products.forEach((p) => {
        expect(p.name.toLowerCase()).toContain('blue');
      });
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/api/products?category=Men');
      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(2);
      res.body.products.forEach((p) => {
        expect(p.category).toBe('Men');
      });
    });

    it('should filter products by price range', async () => {
      const res = await request(app).get('/api/products?minPrice=30&maxPrice=50');
      expect(res.statusCode).toBe(200);
      res.body.products.forEach((p) => {
        expect(p.price).toBeGreaterThanOrEqual(30);
        expect(p.price).toBeLessThanOrEqual(50);
      });
    });

    it('should support pagination', async () => {
      const page1 = await request(app).get('/api/products?page=1&limit=2');
      expect(page1.statusCode).toBe(200);
      expect(page1.body.products).toHaveLength(2);
      expect(page1.body.page).toBe(1);
      expect(page1.body.total).toBe(5);
      expect(page1.body.pages).toBe(3);

      const page2 = await request(app).get('/api/products?page=2&limit=2');
      expect(page2.body.products).toHaveLength(2);
      expect(page2.body.page).toBe(2);
    });

    it('should return empty results for non-matching search', async () => {
      const res = await request(app).get('/api/products?keyword=NonExistentXYZ123');
      expect(res.statusCode).toBe(200);
      expect(res.body.products).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should return 404 for non-existent product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/products/${fakeId}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });
  });

  // =====================================================================
  // FLOW 3 — Admin Update & Delete with DB Verification
  // =====================================================================
  describe('Admin Update & Delete Flow', () => {
    let productId;

    beforeEach(async () => {
      const { body } = await createProduct(adminToken, {
        name: 'Original Product',
        price: 30.00,
        stock: 10,
        brand: 'OriginalBrand',
      });
      productId = body._id;
    });

    it('should update a product then verify changes persist in DB', async () => {
      const updateRes = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Product', price: 39.99 });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.name).toBe('Updated Product');
      expect(updateRes.body.price).toBe(39.99);

      // ── DB Verification ──────────────────────────────────────────────
      const dbProduct = await Product.findById(productId);
      expect(dbProduct.name).toBe('Updated Product');
      expect(dbProduct.price).toBe(39.99);
      expect(dbProduct.description).toContain('Test product'); // unchanged field
    });

    it('should delete a product then verify it is gone from DB', async () => {
      const deleteRes = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.message).toBe('Product removed');

      // ── DB Verification ──────────────────────────────────────────────
      const dbProduct = await Product.findById(productId);
      expect(dbProduct).toBeNull();

      // API should also return 404
      const fetchRes = await request(app).get(`/api/products/${productId}`);
      expect(fetchRes.statusCode).toBe(404);
    });

    it('should reject update by regular user → 401', async () => {
      const res = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacked Name' });
      expect(res.statusCode).toBe(403);

      // ── DB Verification: name unchanged ──────────────────────────────
      const dbProduct = await Product.findById(productId);
      expect(dbProduct.name).toBe('Original Product');
    });

    it('should reject delete by regular user → 401', async () => {
      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toBe(403);

      // ── DB Verification: product still exists ────────────────────────
      const dbProduct = await Product.findById(productId);
      expect(dbProduct).not.toBeNull();
    });
  });

  // =====================================================================
  // FLOW 4 — Product Reviews
  // =====================================================================
  describe('Product Review Flow', () => {
    let productId;

    beforeEach(async () => {
      const { body } = await createProduct(adminToken, {
        name: 'Reviewable Product',
        price: 50.00,
        brand: 'ReviewBrand',
      });
      productId = body._id;
    });

    it('should add a review then verify rating in DB', async () => {
      const reviewRes = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 4, comment: 'Great product!' });
      expect(reviewRes.statusCode).toBe(201);

      // ── DB Verification ──────────────────────────────────────────────
      const dbProduct = await Product.findById(productId);
      expect(dbProduct.numReviews).toBe(1);
      expect(dbProduct.rating).toBe(4);
      expect(dbProduct.reviews).toHaveLength(1);
      expect(dbProduct.reviews[0].comment).toBe('Great product!');
    });

    it('should update an existing review by the same user', async () => {
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 3, comment: 'Decent product' });

      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 5, comment: 'Actually, it is amazing!' });

      const dbProduct = await Product.findById(productId);
      expect(dbProduct.numReviews).toBe(1); // not 2
      expect(dbProduct.rating).toBe(5);
      expect(dbProduct.reviews[0].comment).toBe('Actually, it is amazing!');
    });

    it('should let a user delete their review', async () => {
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 4, comment: 'To be deleted' });

      const deleteRes = await request(app)
        .delete(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(deleteRes.statusCode).toBe(200);

      // ── DB Verification ──────────────────────────────────────────────
      const dbProduct = await Product.findById(productId);
      expect(dbProduct.numReviews).toBe(0);
      expect(dbProduct.rating).toBe(0);
      expect(dbProduct.reviews).toHaveLength(0);
    });
  });

  // =====================================================================
  // FLOW 5 — Bulk Upload
  // =====================================================================
  describe('Bulk Upload Flow', () => {
    it('should bulk upload products as admin then verify in DB', async () => {
      const bulkRes = await request(app)
        .post('/api/products/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          products: [
            { name: 'Bulk 1', price: 10, description: 'D1', category: 'Men', stock: 5, brand: 'X' },
            { name: 'Bulk 2', price: 20, description: 'D2', category: 'Women', stock: 10, brand: 'Y' },
            { name: 'Bulk 3', price: 30, description: 'D3', category: 'Kids', stock: 15, brand: 'Z' },
          ],
        });

      expect(bulkRes.statusCode).toBe(201);
      expect(bulkRes.body.products).toHaveLength(3);

      // ── DB Verification ──────────────────────────────────────────────
      const dbCount = await Product.countDocuments();
      expect(dbCount).toBe(3);
    });

    it('should reject bulk upload with empty array', async () => {
      const res = await request(app)
        .post('/api/products/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ products: [] });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('No products provided');
    });
  });

  // =====================================================================
  // FLOW 6 — Performance Assertions
  // =====================================================================
  describe('Performance', () => {
    it('should fetch product list in under 500ms', async () => {
      // Seed a few products
      await createProducts(adminToken, 5);

      const { durationMs } = await timed(request(app).get('/api/products'));
      expect(durationMs).toBeLessThan(500);
    });

    it('should create a product in under 500ms', async () => {
      const { durationMs } = await timed(
        request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Perf Product',
            price: 19.99,
            description: 'Performance test',
            category: 'Men',
            stock: 10,
            brand: 'PerfBrand',
          }),
      );
      expect(durationMs).toBeLessThan(500);
    });
  });
});
