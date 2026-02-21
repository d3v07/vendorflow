import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VendorFlow API',
      version: '1.0.0',
      description: `
## Multi-tenant Vendor Management Platform API

VendorFlow is a comprehensive vendor, contract, and invoice management platform designed for enterprise use.

### Features
- **Multi-tenant Architecture**: Complete data isolation between tenants
- **Role-Based Access Control**: Admin, Manager, and Viewer roles
- **JWT Authentication**: Secure access and refresh token flow
- **Redis Caching**: Fast dashboard and analytics queries
- **Background Jobs**: Async invoice PDF generation and renewal emails
- **Stripe Integration**: Subscription management with feature gating

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### Rate Limiting
API requests are rate-limited to 100 requests per 15 minutes per IP.
      `,
      contact: {
        name: 'VendorFlow Support',
        email: 'support@vendorflow.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.vendorflow.dev',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input data' },
                details: { type: 'object' },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        Vendor: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            companyName: { type: 'string', example: 'Acme Corp' },
            category: {
              type: 'string',
              enum: ['Technology', 'Marketing', 'Legal', 'Finance', 'HR Services', 'Facilities', 'Consulting', 'Logistics'],
            },
            contactName: { type: 'string', example: 'John Doe' },
            contactEmail: { type: 'string', format: 'email', example: 'john@acme.com' },
            contactPhone: { type: 'string', example: '+1-555-123-4567' },
            address: { type: 'string', example: '123 Main St, City, State 12345' },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Contract: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            vendorId: { type: 'string' },
            vendorName: { type: 'string', example: 'Acme Corp' },
            title: { type: 'string', example: 'Annual Software License' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            value: { type: 'number', example: 50000 },
            autoRenew: { type: 'boolean', example: true },
            status: { type: 'string', enum: ['active', 'expiring_soon', 'expired', 'draft'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            invoiceNumber: { type: 'string', example: 'INV-2024-0001' },
            vendorId: { type: 'string' },
            vendorName: { type: 'string', example: 'Acme Corp' },
            contractId: { type: 'string' },
            contractTitle: { type: 'string' },
            amount: { type: 'number', example: 5000 },
            dueDate: { type: 'string', format: 'date' },
            paidDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['paid', 'pending', 'overdue', 'draft'] },
            description: { type: 'string' },
            pdfUrl: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', format: 'email', example: 'admin@company.com' },
            name: { type: 'string', example: 'Admin User' },
            role: { type: 'string', enum: ['admin', 'manager', 'viewer'] },
            isActive: { type: 'boolean', example: true },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalVendors: { type: 'integer', example: 150 },
            activeContracts: { type: 'integer', example: 75 },
            unpaidInvoices: { type: 'integer', example: 12 },
            monthlySpend: { type: 'number', example: 125000 },
            vendorsTrend: { type: 'number', example: 5.2 },
            contractsTrend: { type: 'number', example: -2.1 },
            invoicesTrend: { type: 'number', example: 8.5 },
            spendTrend: { type: 'number', example: 3.8 },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'integer', example: 900 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management (admin only)' },
      { name: 'Vendors', description: 'Vendor CRUD operations' },
      { name: 'Contracts', description: 'Contract management' },
      { name: 'Invoices', description: 'Invoice management' },
      { name: 'Dashboard', description: 'Dashboard analytics (cached)' },
      { name: 'Billing', description: 'Subscription and billing' },
      { name: 'Settings', description: 'Tenant settings' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'VendorFlow API Docs',
    })
  );

  // JSON spec endpoint
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default swaggerSpec;
