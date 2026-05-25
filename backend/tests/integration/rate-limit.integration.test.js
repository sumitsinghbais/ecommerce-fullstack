const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('../setup');

// Set environment variable
process.env.ENABLE_RATE_LIMIT = 'true';

let app;
describe('Rate Limiting Integration Tests', () => {
  beforeAll(async () => {
    // Isolate modules so server.js gets the new env var
    jest.isolateModules(() => {
      app = require('../../server');
    });
    await connectTestDB();
  });

  afterAll(async () => {
    delete process.env.ENABLE_RATE_LIMIT;
    await disconnectTestDB();
  });

  it('should return 429 Too Many Requests after exceeding limit', async () => {
    // The current limit in server.js is 100 per 15 mins.
    // We'll send 101 requests. 
    // To speed up, we can use a smaller number if we had control, 
    // but we'll follow the real config.
    
    // Note: In a real CI environment, 100 requests is very fast.
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(request(app).get('/'));
    }

    // Wait for all 100 requests to complete
    await Promise.all(requests);

    // The 101st request should fail
    const res = await request(app).get('/');
    
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toContain('Too many requests');
  }, 30000); // 30s timeout for 100 requests
});
