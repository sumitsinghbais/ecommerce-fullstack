/**
 * ═══════════════════════════════════════════════════════════════════════
 * TEST DATA FACTORY — Production-Grade Seed Helpers
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Reusable factory functions that create test entities via the REAL API
 * (Supertest → Express → Mongoose → in-memory MongoDB). Nothing is mocked.
 *
 * Every factory appends a unique suffix (crypto.randomUUID) so tests can
 * run in parallel without data collisions.
 */

const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

// ── Unique-ifier ─────────────────────────────────────────────────────────
const uid = () => randomUUID().slice(0, 8);

// ── Shipping address shared by all order helpers ─────────────────────────
const DEFAULT_SHIPPING = {
  street: '123 Test Street',
  city: 'Mumbai',
  state: 'MH',
  zipCode: '400001',
  country: 'India',
};

// ═════════════════════════════════════════════════════════════════════════
// AUTH FACTORIES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Register a user via the API and return { body, token }.
 * @param {object} overrides — any field to override (name, email, password).
 */
const registerUser = async (overrides = {}) => {
  const id = uid();
  const payload = {
    name: overrides.name || 'Test User',
    email: overrides.email || `user_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
    password: overrides.password || 'Password123',
    ...overrides,
  };

  const res = await request(app)
    .post('/api/auth/register')
    .send(payload);

  return { res, body: res.body, token: res.body.token, status: res.statusCode };
};

/**
 * Register + promote to admin + re-login so the JWT carries the
 * latest DB state.
 */
const registerAdmin = async (overrides = {}) => {
  const id = uid();
  const email = overrides.email || `admin_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const password = overrides.password || 'AdminPass123';

  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      name: overrides.name || `Admin_${id}`,
      email,
      password,
    });

  // Promote directly in the DB
  await User.findByIdAndUpdate(reg.body._id, { role: 'admin' });

  // Re-login so middleware reads the correct role
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return { res: login, body: login.body, token: login.body.token, userId: login.body._id };
};

/**
 * Login an existing user.
 */
const loginUser = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return { res, body: res.body, token: res.body.token, status: res.statusCode };
};

// ═════════════════════════════════════════════════════════════════════════
// PRODUCT FACTORIES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Create a product through the admin API.
 * Requires an admin token.
 */
const createProduct = async (tokenOrOverrides, overrides = {}) => {
  const Product = require('../../models/Product');
  let token = typeof tokenOrOverrides === 'string' ? tokenOrOverrides : null;
  let data = token ? overrides : (tokenOrOverrides || {});

  const id = uid();
  const payload = {
    name: data.name || `Product_${id}`,
    price: data.price ?? 49.99,
    description: data.description || `Test product ${id}`,
    category: data.category || 'Men',
    stock: data.stock ?? 100,
    brand: data.brand || 'TestBrand',
    ...data,
  };

  if (token) {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    return { res, body: res.body, productId: res.body._id, status: res.statusCode, ...res.body };
  } else {
    const product = await Product.create(payload);
    return { res: null, body: product, productId: product._id, status: 201, ...product.toObject() };
  }
};

/**
 * Create multiple products in one go. Returns an array of bodies.
 */
const createProducts = async (adminToken, count = 3, overridesArr = []) => {
  const results = [];
  for (let i = 0; i < count; i++) {
    const overrides = overridesArr[i] || {};
    const product = await createProduct(adminToken, overrides);
    results.push(product);
  }
  return results;
};

// ═════════════════════════════════════════════════════════════════════════
// CART FACTORIES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Add a product to the user's cart.
 */
const addToCart = async (userToken, productId, quantity = 1) => {
  const res = await request(app)
    .post('/api/cart')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ productId, quantity });

  return { res, body: res.body, status: res.statusCode };
};

// ═════════════════════════════════════════════════════════════════════════
// ORDER FACTORIES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Create an order. `items` is an array of { product (body), quantity }.
 */
const createOrder = async (userToken, items, overrides = {}) => {
  const orderItems = items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    quantity: item.quantity,
    price: item.product.price,
  }));

  const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      orderItems,
      shippingAddress: overrides.shippingAddress || DEFAULT_SHIPPING,
      paymentMethod: overrides.paymentMethod || 'Mock',
      totalPrice: overrides.totalPrice ?? totalPrice,
      ...overrides,
    });

  return { res, body: res.body, orderId: res.body._id, status: res.statusCode };
};

// ═════════════════════════════════════════════════════════════════════════
// TOKEN HELPERS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Generate an expired JWT for negative-flow tests.
 */
const generateExpiredToken = () => {
  return jwt.sign(
    { id: '507f1f77bcf86cd799439011' },
    process.env.JWT_SECRET,
    { expiresIn: '-1h' },
  );
};

/**
 * Generate a token signed with a WRONG secret.
 */
const generateInvalidToken = () => {
  return jwt.sign(
    { id: '507f1f77bcf86cd799439011' },
    'completely_wrong_secret',
    { expiresIn: '1h' },
  );
};

// ═════════════════════════════════════════════════════════════════════════
// PERFORMANCE HELPER
// ═════════════════════════════════════════════════════════════════════════

/**
 * Wraps a Supertest chain and returns { res, durationMs }.
 * Usage:
 *   const { res, durationMs } = await timed(
 *     request(app).get('/api/products')
 *   );
 */
const timed = async (supertestChain) => {
  const start = performance.now();
  const res = await supertestChain;
  const durationMs = performance.now() - start;
  return { res, durationMs };
};

const createTestUser = registerUser;
const createTestAdmin = registerAdmin;
const createTestProduct = createProduct;
const createTestOrder = createOrder;

module.exports = {
  uid,
  DEFAULT_SHIPPING,
  // Auth
  registerUser,
  registerAdmin,
  loginUser,
  createTestUser,
  createTestAdmin,
  // Products
  createProduct,
  createProducts,
  createTestProduct,
  // Cart
  addToCart,
  // Orders
  createOrder,
  createTestOrder,
  // Tokens
  generateExpiredToken,
  generateInvalidToken,
  // Perf
  timed,
};
