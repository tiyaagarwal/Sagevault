const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

process.env.JWT_SECRET = 'test_secret_at_least_32_characters_long_ok';
process.env.FRONTEND_URL = 'http://localhost:5173';
// config/langchain.js constructs the Gemini client as a module-level side
// effect at require() time (via documentController -> Document route), so
// app.js can't be imported without *a* key present, even though these auth
// tests never exercise that code path. A dummy value is enough — no request
// that would actually call Gemini runs in this suite.
process.env.GOOGLE_API_KEY = 'test-dummy-key';

const { createApp } = require('../app');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

describe('POST /api/v1/auth/register', () => {
  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('creates a user and returns a token, without leaking the password hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects registering the same email twice', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'dup@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'user@example.com', password: 'password123' });
  });

  it('rejects a missing password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'user@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials and returns a usable token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));

    const profile = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.email).toBe('user@example.com');
  });
});

describe('GET /api/v1/auth/profile', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/v1/auth/profile');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/invalid token', async () => {
    const res = await request(app).get('/api/v1/auth/profile').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('unmatched routes', () => {
  it('returns a JSON 404', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
