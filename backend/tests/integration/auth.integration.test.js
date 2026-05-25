const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const User = require('../../models/User');
const {
  registerUser,
  registerAdmin,
  loginUser,
  generateExpiredToken,
  generateInvalidToken,
  timed,
} = require('../utils/factories');

/**
 * ═══════════════════════════════════════════════════════════════════════
 * AUTH INTEGRATION TESTS — Production-Grade
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Every test uses the real Express app backed by an isolated in-memory
 * MongoDB instance. No controllers or DB calls are mocked.
 *
 * What's covered:
 *   ✔ Register → Login → Protected Route (happy path)
 *   ✔ Duplicate registration prevention + DB verification
 *   ✔ Invalid login scenarios (wrong password, non-existent, blocked)
 *   ✔ Authorization (missing / invalid / expired / wrong-secret tokens)
 *   ✔ Forgot password → OTP → Reset → Login with new password
 *   ✔ Input validation (missing fields, bad email, short password)
 *   ✔ Transaction-level DB state assertions after every mutation
 *   ✔ Performance assertions (< 500 ms per API call)
 */
describe('Auth Integration Tests', () => {
  // ── Lifecycle ─────────────────────────────────────────────────────────
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  // =====================================================================
  // FLOW 1 — Register → Login → Access Protected Route
  // =====================================================================
  describe('Register → Login → Protected Route Flow', () => {
    it('should complete the full auth lifecycle with DB verification', async () => {
      // ── Step 1: Register ─────────────────────────────────────────────
      const { res: regRes, token: regToken } = await timed(
        request(app).post('/api/auth/register').send({
          name: 'Integration User',
          email: 'integration@example.com',
          password: 'securePass123',
        }),
      );

      expect(regRes.statusCode).toBe(201);
      expect(regRes.body).toHaveProperty('token');
      expect(regRes.body).toHaveProperty('_id');
      expect(regRes.body.name).toBe('Integration User');
      expect(regRes.body.email).toBe('integration@example.com');
      expect(regRes.body.role).toBe('user');

      // ── DB Verification: user really exists ──────────────────────────
      const dbUser = await User.findById(regRes.body._id);
      expect(dbUser).not.toBeNull();
      expect(dbUser.email).toBe('integration@example.com');
      expect(dbUser.password).not.toBe('securePass123'); // hashed

      // ── Step 2: Login ────────────────────────────────────────────────
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'integration@example.com', password: 'securePass123' });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
      expect(loginRes.body.email).toBe('integration@example.com');

      // ── Step 3: Access protected route ───────────────────────────────
      const protectedRes = await request(app)
        .get('/api/orders/myorders')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(protectedRes.statusCode).toBe(200);
      expect(Array.isArray(protectedRes.body)).toBe(true);
    });

    it('should return consistent user data between register and login', async () => {
      const { body: regBody } = await registerUser({
        name: 'Consistency Check',
        email: 'consistent@example.com',
      });

      const { body: loginBody } = await loginUser(
        'consistent@example.com',
        'Password123',
      );

      expect(regBody._id).toBe(loginBody._id);
      expect(regBody.email).toBe(loginBody.email);
      expect(regBody.name).toBe(loginBody.name);
    });
  });

  // =====================================================================
  // FLOW 2 — Duplicate Registration Prevention
  // =====================================================================
  describe('Duplicate Registration Prevention', () => {
    it('should allow first registration then reject duplicate and verify DB count', async () => {
      const email = 'unique@example.com';

      const first = await registerUser({ email });
      expect(first.status).toBe(201);

      const second = await registerUser({ name: 'Duplicate', email });
      expect(second.status).toBe(400);
      expect(second.body.message).toBe('User already exists');

      // ── DB Verification: only one record ─────────────────────────────
      const count = await User.countDocuments({ email });
      expect(count).toBe(1);
    });
  });

  // =====================================================================
  // FLOW 3 — Invalid Login Scenarios
  // =====================================================================
  describe('Invalid Login Credentials', () => {
    const email = 'logintester@example.com';
    const password = 'correctPassword';

    beforeEach(async () => {
      await registerUser({ email, password });
    });

    it('should reject login with wrong password', async () => {
      const { res } = await loginUser(email, 'wrongPassword');
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const { res } = await loginUser('nobody@example.com', 'anyPassword');
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login for a blocked user and verify DB state', async () => {
      await User.findOneAndUpdate({ email }, { isBlocked: true });

      // ── DB Verification: user is actually blocked ────────────────────
      const dbUser = await User.findOne({ email });
      expect(dbUser.isBlocked).toBe(true);

      const { res } = await loginUser(email, password);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('Your account has been blocked.');
    });
  });

  // =====================================================================
  // FLOW 4 — Authorization (Token Validation) — NEGATIVE FLOWS
  // =====================================================================
  describe('Authorization Flow', () => {
    const protectedEndpoint = '/api/orders/myorders';

    it('should reject requests WITHOUT any token → 401', async () => {
      const res = await request(app).get(protectedEndpoint);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should reject requests with a MALFORMED token → 401', async () => {
      const res = await request(app)
        .get(protectedEndpoint)
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not authorized, token failed');
    });

    it('should reject requests with an EXPIRED token → 401', async () => {
      const expiredToken = generateExpiredToken();

      const res = await request(app)
        .get(protectedEndpoint)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not authorized, token failed');
    });

    it('should reject requests with a WRONG-SECRET token → 401', async () => {
      const invalidToken = generateInvalidToken();

      const res = await request(app)
        .get(protectedEndpoint)
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not authorized, token failed');
    });

    it('should accept a VALID token and return user-scoped data', async () => {
      const { token } = await registerUser();

      const res = await request(app)
        .get(protectedEndpoint)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // =====================================================================
  // FLOW 5 — Forgot Password → Reset Password
  // =====================================================================
  describe('Forgot Password → Reset Password Flow', () => {
    it('should send OTP, reset password, then login with new password', async () => {
      const email = 'forgot@example.com';
      await registerUser({ email, password: 'oldPassword123' });

      // Request OTP
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });
      expect(forgotRes.statusCode).toBe(200);

      // ── DB Verification: OTP was stored ──────────────────────────────
      const user = await User.findOne({ email });
      expect(user.resetPasswordOtp).toBeTruthy();
      expect(user.resetPasswordExpires).toBeTruthy();
      expect(new Date(user.resetPasswordExpires).getTime()).toBeGreaterThan(Date.now());

      const otp = user.resetPasswordOtp;

      // Reset password
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ email, otp, newPassword: 'newPassword456' });
      expect(resetRes.statusCode).toBe(200);
      expect(resetRes.body.message).toBe('Password reset successfully!');

      // ── DB Verification: OTP fields cleared ──────────────────────────
      const updatedUser = await User.findOne({ email });
      expect(updatedUser.resetPasswordOtp).toBeUndefined();
      expect(updatedUser.resetPasswordExpires).toBeUndefined();

      // Old password should not work
      const { res: oldLogin } = await loginUser(email, 'oldPassword123');
      expect(oldLogin.statusCode).toBe(400);

      // New password should work
      const { res: newLogin } = await loginUser(email, 'newPassword456');
      expect(newLogin.statusCode).toBe(200);
      expect(newLogin.body).toHaveProperty('token');
    });

    it('should reject reset with invalid OTP', async () => {
      const email = 'otp-fail@example.com';
      await registerUser({ email });

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email, otp: '000000', newPassword: 'irrelevant' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid or expired OTP');
    });
  });

  // =====================================================================
  // FLOW 6 — Input Validation & Error Handling (NEGATIVE FLOWS)
  // =====================================================================
  describe('Input Validation & Error Handling', () => {
    it('should reject registration with missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'noname@example.com', password: 'password123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bad Email', email: 'not-an-email', password: 'password123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject registration with too-short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Short Pass', email: 'shortpass@example.com', password: '123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject login with missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject login with missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'someone@example.com' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject forgot-password for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@example.com' });
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });

  // =====================================================================
  // FLOW 7 — Performance Assertions
  // =====================================================================
  describe('Performance', () => {
    it('should register a user in under 500ms', async () => {
      const { durationMs } = await timed(
        request(app).post('/api/auth/register').send({
          name: 'Perf Test',
          email: 'perf@example.com',
          password: 'password123',
        }),
      );
      expect(durationMs).toBeLessThan(500);
    });

    it('should login in under 500ms', async () => {
      await registerUser({ email: 'loginperf@example.com' });

      const { durationMs } = await timed(
        request(app).post('/api/auth/login').send({
          email: 'loginperf@example.com',
          password: 'Password123',
        }),
      );
      expect(durationMs).toBeLessThan(500);
    });
  });
});
