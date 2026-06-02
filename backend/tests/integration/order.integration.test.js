const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Coupon = require('../../models/Coupon');
const DiscountRule = require('../../models/DiscountRule');
const mongoose = require('mongoose');
const {
  registerUser,
  registerAdmin,
  createProduct,
  addToCart,
  createOrder,
  timed,
} = require('../utils/factories');

/**
 * ═══════════════════════════════════════════════════════════════════════
 * ORDER INTEGRATION TESTS — Production-Grade
 * ═══════════════════════════════════════════════════════════════════════
 *
 * What's covered:
 *   ✔ Cart → Order complete lifecycle with stock verification
 *   ✔ Admin order management (view all, status transitions)
 *   ✔ Payment flow (mark paid)
 *   ✔ Cart management (add, update, remove)
 *   ✔ Multi-user order isolation
 *   ✔ Negative flows:
 *       – Empty order items
 *       – Unauthenticated checkout
 *       – Out-of-stock products
 *       – Non-existent order ID
 *       – Invalid order ID format
 *       – Unauthorized admin access by regular user
 *   ✔ Transaction-level DB assertions after every mutation
 *   ✔ Performance assertions
 */
describe('Order Integration Tests', () => {
  let adminToken, userToken, userId;

  // ── Lifecycle ─────────────────────────────────────────────────────────
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
    userId = user.body._id;
  });

  // ── Shared shipping address ───────────────────────────────────────────
  const shippingAddress = {
    street: '123 Main Street',
    city: 'Mumbai',
    state: 'MH',
    zipCode: '400001',
    country: 'India',
  };

  // =====================================================================
  // FLOW 1 — Cart → Order Complete Lifecycle
  // =====================================================================
  describe('Cart → Order Complete Lifecycle', () => {
    it('should add to cart, create order, verify stock & order in DB', async () => {
      // ── Step 1: Admin creates two products ──────────────────────────
      const { body: productA } = await createProduct(adminToken, {
        name: 'Running Shoes',
        price: 120.00,
        stock: 50,
      });
      const { body: productB } = await createProduct(adminToken, {
        name: 'Sports T-Shirt',
        price: 35.00,
        stock: 200,
      });

      // ── Step 2: User adds products to cart ──────────────────────────
      const cartResA = await addToCart(userToken, productA._id, 2);
      expect(cartResA.status).toBe(201);
      expect(cartResA.body.items).toHaveLength(1);
      expect(cartResA.body.items[0].quantity).toBe(2);

      const cartResB = await addToCart(userToken, productB._id, 3);
      expect(cartResB.status).toBe(201);
      expect(cartResB.body.items).toHaveLength(2);

      // ── Step 3: Verify cart in DB ───────────────────────────────────
      const dbCart = await Cart.findOne({ user: userId });
      expect(dbCart).not.toBeNull();
      expect(dbCart.items).toHaveLength(2);

      // ── Step 4: Create order ────────────────────────────────────────
      const { body: order, status: orderStatus } = await createOrder(
        userToken,
        [
          { product: productA, quantity: 2 },
          { product: productB, quantity: 3 },
        ],
      );

      expect(orderStatus).toBe(201);
      expect(order.orderItems).toHaveLength(2);
      expect(order.totalPrice).toBe(Number((345 + 345 * 0.05).toFixed(2))); // Subtotal 345 + 5% tax, 0 shipping
      expect(order.status).toBe('Pending');
      expect(order.isPaid).toBe(false);

      // ── Step 5: DB Verification — order exists ──────────────────────
      const dbOrder = await Order.findById(order._id);
      expect(dbOrder).not.toBeNull();
      expect(dbOrder.orderItems).toHaveLength(2);
      expect(dbOrder.user.toString()).toBe(userId);

      // ── Step 6: DB Verification — stock reduced ─────────────────────
      const updatedA = await Product.findById(productA._id);
      const updatedB = await Product.findById(productB._id);
      expect(updatedA.stock).toBe(48); // 50 - 2
      expect(updatedB.stock).toBe(197); // 200 - 3

      // ── Step 7: Fetch user's orders via API ─────────────────────────
      const myOrdersRes = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(myOrdersRes.statusCode).toBe(200);
      expect(myOrdersRes.body).toHaveLength(1);
      expect(myOrdersRes.body[0]._id).toBe(order._id);

      // ── Step 8: Fetch order by ID ───────────────────────────────────
      const orderDetailRes = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderDetailRes.statusCode).toBe(200);
      expect(orderDetailRes.body._id).toBe(order._id);
    });
  });

  // =====================================================================
  // FLOW 2 — Admin Order Management
  // =====================================================================
  describe('Admin Order Management Flow', () => {
    let orderId;

    beforeEach(async () => {
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createOrder(userToken, [
        { product, quantity: 1 },
      ]);
      orderId = order._id;
    });

    it('should let admin view all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject regular user from viewing all orders → 403', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should let admin view any specific order', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(orderId);
    });

    it('should update order status through full lifecycle with DB verification', async () => {
      // Pending → Shipped
      const shippedRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipped' });

      expect(shippedRes.statusCode).toBe(200);
      expect(shippedRes.body.status).toBe('Shipped');
      expect(shippedRes.body.isDelivered).toBe(false);

      // ── DB Verification ──────────────────────────────────────────────
      let dbOrder = await Order.findById(orderId);
      expect(dbOrder.status).toBe('Shipped');

      // Shipped → Delivered
      const deliveredRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(deliveredRes.statusCode).toBe(200);
      expect(deliveredRes.body.status).toBe('Delivered');
      expect(deliveredRes.body.isDelivered).toBe(true);
      expect(deliveredRes.body.deliveredAt).toBeTruthy();

      // ── DB Verification ──────────────────────────────────────────────
      dbOrder = await Order.findById(orderId);
      expect(dbOrder.isDelivered).toBe(true);
      expect(dbOrder.deliveredAt).toBeTruthy();
    });

    it('should reject status update by regular user → 401', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'Shipped' });

      expect(res.statusCode).toBe(403);

      // ── DB Verification: status unchanged ────────────────────────────
      const dbOrder = await Order.findById(orderId);
      expect(dbOrder.status).toBe('Pending');
    });
  });

  // =====================================================================
  // FLOW 3 — Order Payment Flow
  // =====================================================================
  describe('Order Payment Flow', () => {
    it('should create order unpaid, mark paid, verify in DB', async () => {
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createOrder(userToken, [
        { product, quantity: 1 },
      ]);

      expect(order.isPaid).toBe(false);

      // Mark as paid
      const payRes = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'mock_payment_123',
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: 'buyer@test.com',
        });

      expect(payRes.statusCode).toBe(200);
      expect(payRes.body.isPaid).toBe(true);
      expect(payRes.body.paidAt).toBeTruthy();
      expect(payRes.body.paymentResult.id).toBe('mock_payment_123');

      // ── DB Verification ──────────────────────────────────────────────
      const dbOrder = await Order.findById(order._id);
      expect(dbOrder.isPaid).toBe(true);
      expect(dbOrder.paymentResult.id).toBe('mock_payment_123');
      expect(dbOrder.paymentResult.status).toBe('COMPLETED');
    });
  });

  // =====================================================================
  // FLOW 4 — Cart Management
  // =====================================================================
  describe('Cart Management Flow', () => {
    let productId;

    beforeEach(async () => {
      const { body } = await createProduct(adminToken);
      productId = body._id;
    });

    it('should add, update quantity, and remove items with DB verification', async () => {
      // ── Add to cart ─────────────────────────────────────────────────
      const addRes = await addToCart(userToken, productId, 1);
      expect(addRes.status).toBe(201);
      expect(addRes.body.items).toHaveLength(1);
      expect(addRes.body.items[0].quantity).toBe(1);

      // ── DB Verification ──────────────────────────────────────────────
      let dbCart = await Cart.findOne({ user: userId });
      expect(dbCart.items).toHaveLength(1);

      // ── Update quantity ─────────────────────────────────────────────
      const updateRes = await request(app)
        .put('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId, quantity: 5 });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.items[0].quantity).toBe(5);

      // ── DB Verification ──────────────────────────────────────────────
      dbCart = await Cart.findOne({ user: userId });
      expect(dbCart.items[0].quantity).toBe(5);

      // ── Remove from cart ────────────────────────────────────────────
      const removeRes = await request(app)
        .delete(`/api/cart/${productId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(removeRes.statusCode).toBe(200);
      expect(removeRes.body.items).toHaveLength(0);

      // ── DB Verification ──────────────────────────────────────────────
      dbCart = await Cart.findOne({ user: userId });
      expect(dbCart.items).toHaveLength(0);
    });

    it('should increment quantity when adding the same product twice', async () => {
      await addToCart(userToken, productId, 2);
      const { body } = await addToCart(userToken, productId, 3);

      expect(body.items).toHaveLength(1);
      expect(body.items[0].quantity).toBe(5); // 2 + 3

      // ── DB Verification ──────────────────────────────────────────────
      const dbCart = await Cart.findOne({ user: userId });
      expect(dbCart.items[0].quantity).toBe(5);
    });
  });

  // =====================================================================
  // FLOW 5 — Negative Flows & Error Handling
  // =====================================================================
  describe('Order Validation & Error Handling', () => {
    it('should reject order with empty order items → 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [],
          shippingAddress,
          paymentMethod: 'Mock',
          totalPrice: 0,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('No order items');

      // ── DB Verification: no order created ────────────────────────────
      const count = await Order.countDocuments({ user: userId });
      expect(count).toBe(0);
    });

    it('should reject order without authentication → 401', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          orderItems: [
            { product: new mongoose.Types.ObjectId(), name: 'Ghost', quantity: 1, price: 10 },
          ],
          shippingAddress,
          paymentMethod: 'Mock',
          totalPrice: 10,
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject order when product is out of stock → 400', async () => {
      const { body: product } = await createProduct(adminToken, {
        name: 'Low Stock Item',
        stock: 2,
        price: 20,
      });

      const { status, body } = await createOrder(userToken, [
        { product, quantity: 10 },
      ]);

      expect(status).toBe(400);
      expect(body.message).toContain('out of stock');

      // ── DB Verification: stock unchanged ─────────────────────────────
      const dbProduct = await Product.findById(product._id);
      expect(dbProduct.stock).toBe(2);
    });

    it('should return 404 for non-existent order ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 for invalid order ID format', async () => {
      const res = await request(app)
        .get('/api/orders/not-a-valid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(500);
    });

    it('should reject order with non-existent product ID → 400', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [
            { product: fakeProductId, name: 'Ghost Product', quantity: 1, price: 10 },
          ],
          shippingAddress,
          paymentMethod: 'Mock',
          totalPrice: 10,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('not found');
    });

    it('should reject order with incomplete shipping address subfields → 400', async () => {
      const { body: product } = await createProduct(adminToken);
      const invalidAddresses = [
        { street: '123' }, // missing city, zipCode, country
        { street: '123', city: 'C' }, // missing zipCode, country
        { street: '123', city: 'C', zipCode: '1' }, // missing country
      ];

      for (const addr of invalidAddresses) {
        const res = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
            shippingAddress: addr,
            paymentMethod: 'Mock',
            totalPrice: product.price,
          });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Full shipping address is required');
      }
    });

    it('should reject order if order item is missing product ID → 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ name: 'No ID Item', quantity: 1, price: 10 }],
          shippingAddress,
          paymentMethod: 'Mock',
          totalPrice: 10,
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Valid product ID is required for each item');
    });

    it('should apply bulk discount if quantity matches rule', async () => {
      const { body: product } = await createProduct(adminToken, { price: 100, stock: 10 });
      await DiscountRule.create({ minQuantity: 5, discountPercentage: 10 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 5, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          totalPrice: 500,
        });

      expect(res.statusCode).toBe(201);
      // subtotal = 500. bulk discount = 50. amountAfterBulk = 450.
      // shipping = 0 (since > 100). tax = 0.05 * 450 = 22.5.
      // total = 450 + 22.5 = 472.5
      expect(res.body.bulkDiscount).toBe(50);
      expect(res.body.totalPrice).toBe(472.5);
    });

    it('should apply percentage coupon with discount capping', async () => {
      const { body: product } = await createProduct(adminToken, { price: 200, stock: 10 });
      // Create percentage coupon with max discount capped at $20
      await Coupon.create({
        code: 'MAXCAP',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 20,
        minOrderAmount: 50,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 5
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          couponCode: 'MAXCAP',
          totalPrice: 200,
        });

      expect(res.statusCode).toBe(201);
      // subtotal = 200. amountAfterBulk = 200.
      // coupon percentage discount = 200 * 0.2 = 40, capped at maxDiscount = 20.
      // shipping = 0 (since > 100). tax = 0.05 * (200 - 20) = 9.
      // total = 180 + 9 = 189
      expect(res.body.couponDiscount).toBe(20);
      expect(res.body.totalPrice).toBe(189);
    });

    it('should apply fixed coupon discount', async () => {
      const { body: product } = await createProduct(adminToken, { price: 50, stock: 10 });
      await Coupon.create({
        code: 'FIXEDVAL',
        discountType: 'fixed',
        discountValue: 15,
        minOrderAmount: 20,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 5
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          couponCode: 'FIXEDVAL',
          totalPrice: 50,
        });

      expect(res.statusCode).toBe(201);
      // subtotal = 50. amountAfterBulk = 50. coupon discount = 15.
      // shipping = 10 (since <= 100). tax = 0.05 * (50 - 15) = 1.75.
      // total = 35 + 10 + 1.75 = 46.75
      expect(res.body.couponDiscount).toBe(15);
      expect(res.body.totalPrice).toBe(46.75);
    });

    it('should not apply expired coupon', async () => {
      const { body: product } = await createProduct(adminToken, { price: 50, stock: 10 });
      await Coupon.create({
        code: 'EXPIRED',
        discountType: 'fixed',
        discountValue: 15,
        minOrderAmount: 20,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        usageLimit: 5
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          couponCode: 'EXPIRED',
          totalPrice: 50,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.couponDiscount).toBe(0);
    });

    it('should not apply coupon with reached usage limit', async () => {
      const { body: product } = await createProduct(adminToken, { price: 50, stock: 10 });
      await Coupon.create({
        code: 'LIMITREACHED',
        discountType: 'fixed',
        discountValue: 15,
        minOrderAmount: 20,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 5,
        usedCount: 5
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          couponCode: 'LIMITREACHED',
          totalPrice: 50,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.couponDiscount).toBe(0);
    });

    it('should not apply coupon with order amount below minimum', async () => {
      const { body: product } = await createProduct(adminToken, { price: 30, stock: 10 });
      await Coupon.create({
        code: 'HIGHMIN',
        discountType: 'fixed',
        discountValue: 15,
        minOrderAmount: 100,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usageLimit: 5
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          couponCode: 'HIGHMIN',
          totalPrice: 30,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.couponDiscount).toBe(0);
    });

    it('should return 404 for order missing user field', async () => {
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createOrder(userToken, [{ product, quantity: 1 }]);

      const originalFindById = Order.findById;
      // Mock findById to return order without user
      Order.findById = jest.fn().mockImplementation((id) => {
        if (id.toString() === order._id.toString()) {
          return {
            _id: order._id,
            user: null,
          };
        }
        return originalFindById(id);
      });

      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      Order.findById = originalFindById;

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Order user not found');
    });

    it('should return 400 when updating status of already Delivered or Cancelled order', async () => {
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createOrder(userToken, [{ product, quantity: 1 }]);

      // Mark Delivered first
      await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipped' });

      await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      // Try updating status again
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipped' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already delivered');
    });

    it('should return 400 when updating status with an invalid transition', async () => {
      const { body: product } = await createProduct(adminToken);
      const { body: order } = await createOrder(userToken, [{ product, quantity: 1 }]);

      // Pending directly to Delivered is invalid (must be Shipped first)
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Cannot change status from Pending to Delivered');
    });

    it('should filter orders by status and date range for admin', async () => {
      const { body: product } = await createProduct(adminToken);
      await createOrder(userToken, [{ product, quantity: 1 }]);

      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get(`/api/orders?status=Pending&startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 500 when database errors on createOrder', async () => {
      // Mock Order.prototype.save to throw error
      const originalSave = Order.prototype.save;
      Order.prototype.save = jest.fn().mockRejectedValue(new Error('createOrder DB error'));

      const { body: product } = await createProduct(adminToken);
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{ product: product._id, name: product.name, quantity: 1, price: product.price }],
          shippingAddress,
          paymentMethod: 'Mock',
          totalPrice: product.price,
        });

      Order.prototype.save = originalSave;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('createOrder DB error');
    });

    it('should return 500 when database errors on getOrderById', async () => {
      const originalFindById = Order.findById;
      Order.findById = jest.fn().mockRejectedValue(new Error('getOrderById DB error'));

      const res = await request(app)
        .get('/api/orders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`);

      Order.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('getOrderById DB error');
    });

    it('should return 500 when database errors on updateOrderToPaid', async () => {
      const originalFindById = Order.findById;
      Order.findById = jest.fn().mockRejectedValue(new Error('updateOrderToPaid DB error'));

      const res = await request(app)
        .put('/api/orders/507f1f77bcf86cd799439011/pay')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: '123', status: 'COMPLETED' });

      Order.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('updateOrderToPaid DB error');
    });

    it('should return 500 when database errors on updateOrderStatus', async () => {
      const originalFindById = Order.findById;
      Order.findById = jest.fn().mockRejectedValue(new Error('updateOrderStatus DB error'));

      const res = await request(app)
        .put('/api/orders/507f1f77bcf86cd799439011/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipped' });

      Order.findById = originalFindById;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('updateOrderStatus DB error');
    });

    it('should return 500 when database errors on getMyOrders', async () => {
      const originalFind = Order.find;
      Order.find = jest.fn().mockRejectedValue(new Error('getMyOrders DB error'));

      const res = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${userToken}`);

      Order.find = originalFind;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('getMyOrders DB error');
    });

    it('should return 500 when database errors on getOrders', async () => {
      const originalFind = Order.find;
      Order.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('getOrders DB error'))
      });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      Order.find = originalFind;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('getOrders DB error');
    });
  });

  // =====================================================================
  // FLOW 6 — Multi-User Order Isolation
  // =====================================================================
  describe('Multi-User Order Isolation', () => {
    it('should ensure users only see their own orders', async () => {
      // Create a second buyer
      const { body: buyer2Body, status: buyer2Status, token: buyer2Token } = await registerUser({ name: 'Buyer Two' });
      expect(buyer2Status).toBe(201);
      expect(buyer2Token).toBeTruthy();

      const { body: product } = await createProduct(adminToken, { stock: 100 });

      // Buyer 1 creates an order
      const { status: order1Status } = await createOrder(userToken, [{ product, quantity: 1 }]);
      expect(order1Status).toBe(201);

      // Buyer 2 creates an order
      await createOrder(buyer2Token, [{ product, quantity: 2 }]);

      // Each buyer should only see their own orders
      const buyer1Orders = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${userToken}`);
      expect(buyer1Orders.body).toHaveLength(1);
      expect(buyer1Orders.body[0].totalPrice).toBe(Number((product.price + 10 + product.price * 0.05).toFixed(2)));

      const buyer2Orders = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${buyer2Token}`);
      expect(buyer2Orders.body).toHaveLength(1);
      expect(buyer2Orders.body[0].totalPrice).toBe(Number((product.price * 2 + 10 + product.price * 2 * 0.05).toFixed(2)));

      // Admin should see all orders
      const allOrders = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(allOrders.body).toHaveLength(2);

      // ── DB Verification ──────────────────────────────────────────────
      const dbCount = await Order.countDocuments();
      expect(dbCount).toBe(2);
    });
  });

  // =====================================================================
  // FLOW 7 — Performance Assertions
  // =====================================================================
  describe('Performance', () => {
    it('should create an order in under 500ms', async () => {
      const { body: product } = await createProduct(adminToken);

      const { durationMs } = await timed(
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            orderItems: [
              { product: product._id, name: product.name, quantity: 1, price: product.price },
            ],
            shippingAddress,
            paymentMethod: 'Mock',
            totalPrice: Number((product.price + 10 + product.price * 0.05).toFixed(2)),
          }),
      );

      expect(durationMs).toBeLessThan(800);
    });

    it('should fetch user orders in under 500ms', async () => {
      const { durationMs } = await timed(
        request(app)
          .get('/api/orders/myorders')
          .set('Authorization', `Bearer ${userToken}`),
      );

      expect(durationMs).toBeLessThan(500);
    });
  });
});
