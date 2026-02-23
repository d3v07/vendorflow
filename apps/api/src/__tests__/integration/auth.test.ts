import request from 'supertest';
import app from '../../app';
import { User, Tenant, RefreshToken } from '../../models';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user and tenant', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@testcompany.com',
          password: 'SecurePass123!',
          name: 'Test Admin',
          tenantName: 'Test Company',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@testcompany.com');
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Verify tenant was created
      const tenant = await Tenant.findOne({ slug: 'test-company' });
      expect(tenant).toBeDefined();
      expect(tenant?.name).toBe('Test Company');
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'SecurePass123!',
          name: 'User One',
          tenantName: 'Company One',
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'SecurePass123!',
          name: 'User Two',
          tenantName: 'Company Two',
        });

      expect(res.status).toBe(409); // Conflict - duplicate email
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User',
          tenantName: 'Test Company',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          name: 'Test User',
          tenantName: 'Test Company',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123!',
          name: 'Login Test',
          tenantName: 'Login Company',
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('login@test.com');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'refresh@test.com',
          password: 'SecurePass123!',
          name: 'Refresh Test',
          tenantName: 'Refresh Company',
        });

      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      // New refresh token should be different
      expect(res.body.data.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me@test.com',
          password: 'SecurePass123!',
          name: 'Me Test',
          tenantName: 'Me Company',
        });

      accessToken = res.body.data.tokens.accessToken;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('me@test.com');
      expect(res.body.data.name).toBe('Me Test');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logout@test.com',
          password: 'SecurePass123!',
          name: 'Logout Test',
          tenantName: 'Logout Company',
        });

      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('should logout and invalidate refresh token', async () => {
      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Try to use the refresh token again
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });
});
