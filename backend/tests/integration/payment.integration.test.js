const mockPaymentIntentCreate = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      paymentIntents: {
        create: mockPaymentIntentCreate
      }
    };
  });
});

const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const { registerUser } = require('../utils/factories');

describe('Payment Integration Tests', () => {
  let userToken;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const user = await registerUser();
    userToken = user.token;
    mockPaymentIntentCreate.mockReset();
  });

  it('should create payment intent successfully when authenticated', async () => {
    mockPaymentIntentCreate.mockResolvedValue({
      client_secret: 'pi_mock_secret_123'
    });

    const res = await request(app)
      .post('/api/payment/create-payment-intent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [{ product: '507f1f77bcf86cd799439011', quantity: 2 }],
        totalPrice: 49.99
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientSecret).toBe('pi_mock_secret_123');

    expect(mockPaymentIntentCreate).toHaveBeenCalledWith({
      amount: 4999, // 49.99 * 100 cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      }
    });
  });

  it('should block unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/payment/create-payment-intent')
      .send({
        items: [],
        totalPrice: 10
      });

    expect(res.statusCode).toBe(401);
  });

  it('should handle Stripe API errors and return 500', async () => {
    mockPaymentIntentCreate.mockRejectedValue(new Error('Stripe authentication failed'));

    const res = await request(app)
      .post('/api/payment/create-payment-intent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [],
        totalPrice: 20
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Stripe authentication failed');
  });

  it('should handle errors without a message field and use fallback', async () => {
    // Rejected value without a message field
    mockPaymentIntentCreate.mockRejectedValue({});

    const res = await request(app)
      .post('/api/payment/create-payment-intent')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [],
        totalPrice: 20
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Payment processing failed');
  });
});
