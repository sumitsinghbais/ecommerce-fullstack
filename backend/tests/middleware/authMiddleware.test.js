const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { protect, admin } = require('../../middleware/authMiddleware');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const { createTestUser, registerAdmin } = require('../utils/factories');

describe('Auth Middleware Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  // Helper to create mock req/res/next
  const createMockReqRes = (overrides = {}) => {
    const req = {
      headers: {},
      ...overrides,
    };
    const res = {
      statusCode: 200,
      status: jest.fn(function (code) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(),
    };
    const next = jest.fn();
    return { req, res, next };
  };

  describe('protect middleware', () => {
    it('should set req.user with a valid token', async () => {
      const { body, token } = await createTestUser({
        email: 'middleware@test.com',
      });

      const { req, res, next } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(body._id.toString());
    });

    it('should reject requests without token', async () => {
      const { req, res, next } = createMockReqRes();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Not authorized, no token' })
      );
    });

    it('should reject requests with invalid token', async () => {
      const { req, res, next } = createMockReqRes({
        headers: { authorization: 'Bearer invalid_token_here' },
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('admin middleware', () => {
    it('should allow admin users', async () => {
      const { req, res, next } = createMockReqRes();
      req.user = { role: 'admin' };

      admin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      const { req, res, next } = createMockReqRes();
      req.user = { role: 'user' };

      admin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Not authorized as an admin' })
      );
    });

    it('should reject when no user is set', async () => {
      const { req, res, next } = createMockReqRes();

      admin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
