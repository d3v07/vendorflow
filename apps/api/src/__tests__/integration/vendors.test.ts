import request from 'supertest';
import app from '../../app';
import { User, Tenant, Vendor } from '../../models';
import mongoose from 'mongoose';

describe('Vendors API', () => {
  let adminToken: string;
  let managerToken: string;
  let viewerToken: string;
  let tenantId: string;

  beforeEach(async () => {
    // Register admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'admin@vendor-test.com',
        password: 'SecurePass123!',
        name: 'Admin User',
        tenantName: 'Vendor Test Company',
      });

    adminToken = adminRes.body.data.tokens.accessToken;
    tenantId = adminRes.body.data.user.tenantId;

    // Create manager user
    const tenant = await Tenant.findById(tenantId);
    const managerUser = await User.create({
      tenantId: tenant!._id,
      email: 'manager@vendor-test.com',
      password: 'SecurePass123!',
      name: 'Manager User',
      role: 'manager',
    });

    const managerRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'manager@vendor-test.com',
        password: 'SecurePass123!',
      });

    managerToken = managerRes.body.data.tokens.accessToken;

    // Create viewer user
    const viewerUser = await User.create({
      tenantId: tenant!._id,
      email: 'viewer@vendor-test.com',
      password: 'SecurePass123!',
      name: 'Viewer User',
      role: 'viewer',
    });

    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'viewer@vendor-test.com',
        password: 'SecurePass123!',
      });

    viewerToken = viewerRes.body.data.tokens.accessToken;
  });

  describe('GET /api/vendors', () => {
    beforeEach(async () => {
      // Create test vendors
      const tenant = await Tenant.findById(tenantId);
      await Vendor.create([
        {
          tenantId: tenant!._id,
          companyName: 'Tech Corp',
          category: 'Technology',
          contactName: 'John Tech',
          contactEmail: 'john@tech.com',
          contactPhone: '555-0001',
          address: '123 Tech St',
          status: 'active',
        },
        {
          tenantId: tenant!._id,
          companyName: 'Marketing Inc',
          category: 'Marketing',
          contactName: 'Jane Marketing',
          contactEmail: 'jane@marketing.com',
          contactPhone: '555-0002',
          address: '456 Marketing Ave',
          status: 'pending',
        },
      ]);
    });

    it('should list vendors for authenticated user', async () => {
      const res = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('should filter vendors by status', async () => {
      const res = await request(app)
        .get('/api/vendors?status=active')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('active');
    });

    it('should search vendors by company name', async () => {
      const res = await request(app)
        .get('/api/vendors?search=Tech')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].companyName).toBe('Tech Corp');
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/vendors?page=1&limit=1')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/vendors');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/vendors', () => {
    const newVendor = {
      companyName: 'New Vendor Corp',
      category: 'Technology',
      contactName: 'New Contact',
      contactEmail: 'new@vendor.com',
      contactPhone: '555-0003',
      address: '789 New St',
      status: 'active',
    };

    it('should create vendor as admin', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newVendor);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('New Vendor Corp');
      expect(res.body.data.id).toBeDefined();
    });

    it('should create vendor as manager', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newVendor);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject create as viewer', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(newVendor);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Missing Fields',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...newVendor,
          contactEmail: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/vendors/:id', () => {
    let vendorId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Update Test Corp',
          category: 'Technology',
          contactName: 'Update Contact',
          contactEmail: 'update@test.com',
          contactPhone: '555-0004',
          status: 'active',
        });

      vendorId = createRes.body.data.id;
    });

    it('should update vendor as admin', async () => {
      const res = await request(app)
        .patch(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'Updated Corp' });

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe('Updated Corp');
    });

    it('should update vendor as manager', async () => {
      const res = await request(app)
        .patch(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'inactive' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
    });

    it('should reject update as viewer', async () => {
      const res = await request(app)
        .patch(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ companyName: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent vendor', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/vendors/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ companyName: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/vendors/:id', () => {
    let vendorId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyName: 'Delete Test Corp',
          category: 'Technology',
          contactName: 'Delete Contact',
          contactEmail: 'delete@test.com',
          contactPhone: '555-0005',
          status: 'active',
        });

      vendorId = createRes.body.data.id;
    });

    it('should delete vendor as admin', async () => {
      const res = await request(app)
        .delete(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify vendor is deleted
      const getRes = await request(app)
        .get(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(404);
    });

    it('should reject delete as manager', async () => {
      const res = await request(app)
        .delete(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject delete as viewer', async () => {
      const res = await request(app)
        .delete(`/api/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
