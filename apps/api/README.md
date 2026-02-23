# VendorFlow API

Production-grade multi-tenant vendor, contract, and invoice management backend built with Node.js, Express, and TypeScript.

## Features

- **Multi-tenant Architecture**: Complete data isolation between tenants
- **JWT Authentication**: Secure access and refresh token flow
- **Role-Based Access Control**: Admin, Manager, and Viewer roles
- **Redis Caching**: Fast dashboard queries with configurable TTL
- **RabbitMQ Background Jobs**: Async PDF generation and email notifications with retry/DLQ
- **Stripe Integration**: Subscription tiers with feature gating
- **OpenAPI Documentation**: Interactive Swagger UI at `/api/docs`

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Cache | Redis + ioredis |
| Queue | RabbitMQ + amqplib |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| Payments | Stripe |
| Docs | swagger-jsdoc + swagger-ui-express |
| Testing | Jest + supertest |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose

### Setup

```bash
# Clone and install
cd apps/api
pnpm install

# Start infrastructure (MongoDB, Redis, RabbitMQ)
docker-compose up -d

# Copy environment variables
cp ../../.env.example .env

# Seed database with demo data
pnpm seed

# Start development server
pnpm dev

# Start background worker (in separate terminal)
pnpm worker
```

### Access

- **API**: http://localhost:4000
- **Swagger UI**: http://localhost:4000/api/docs
- **RabbitMQ UI**: http://localhost:15672 (guest/guest)

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account + tenant |
| POST | `/api/auth/login` | Get tokens |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET | `/api/auth/me` | Get current user |

### Vendors
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/vendors` | viewer+ | List with pagination |
| GET | `/api/vendors/:id` | viewer+ | Get single |
| POST | `/api/vendors` | manager+ | Create |
| PATCH | `/api/vendors/:id` | manager+ | Update |
| DELETE | `/api/vendors/:id` | admin | Delete |

### Contracts
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/contracts` | viewer+ | List |
| GET | `/api/contracts/:id` | viewer+ | Get single |
| POST | `/api/contracts` | manager+ | Create |
| PATCH | `/api/contracts/:id` | manager+ | Update |
| DELETE | `/api/contracts/:id` | admin | Delete |

### Invoices
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/invoices` | viewer+ | List |
| GET | `/api/invoices/:id` | viewer+ | Get single |
| POST | `/api/invoices` | manager+ | Create (triggers PDF job) |
| PATCH | `/api/invoices/:id` | manager+ | Update |
| PATCH | `/api/invoices/:id/mark-as-paid` | manager+ | Mark paid |
| DELETE | `/api/invoices/:id` | admin | Delete |

### Dashboard (Cached)
| Method | Endpoint | Cache TTL |
|--------|----------|-----------|
| GET | `/api/dashboard/stats` | 60s |
| GET | `/api/dashboard/spend-by-category` | 300s |
| GET | `/api/dashboard/monthly-spend` | 300s |
| GET | `/api/dashboard/upcoming-renewals` | 120s |
| GET | `/api/dashboard/unpaid-invoices` | 60s |

### Billing
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/billing` | viewer+ | Get subscription & usage |
| POST | `/api/billing/checkout` | admin | Create Stripe checkout |
| POST | `/api/billing/portal` | admin | Open billing portal |
| POST | `/api/billing/cancel` | admin | Cancel subscription |

## Scripts

```bash
pnpm dev          # Start API server (hot reload)
pnpm build        # Compile TypeScript
pnpm start        # Start production server
pnpm worker       # Start background worker
pnpm seed         # Seed database with demo data
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm loadtest     # Run load test
```

## Environment Variables

```bash
# Server
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/vendorflow

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://vendorflow:vendorflow123@localhost:5672

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx

# Frontend
FRONTEND_URL=http://localhost:5173
```

## Architecture

```
src/
├── config/         # Database, Redis, RabbitMQ, Stripe configs
├── controllers/    # Request handlers
├── jobs/           # RabbitMQ job processors
├── middleware/     # Auth, RBAC, validation, cache, errors
├── models/         # Mongoose schemas
├── routes/         # Express routers with Swagger docs
├── services/       # Business logic
├── types/          # TypeScript definitions
├── utils/          # Helpers (jwt, pagination, logger)
├── validators/     # Zod schemas
├── webhooks/       # Stripe webhooks
├── app.ts          # Express setup
├── index.ts        # Entry point
└── worker.ts       # Background worker entry
```

## Subscription Tiers

| Feature | Free | Starter | Pro |
|---------|------|---------|-----|
| Users | 3 | 10 | Unlimited |
| Vendors | 25 | 100 | Unlimited |
| Contracts | 50 | 250 | Unlimited |
| Invoices | 100 | 1000 | Unlimited |
| Background Jobs | No | Yes | Yes |
| API Access | No | No | Yes |

## Demo Scenarios

### 1. CRUD Operations
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"DemoPass123!"}' \
  | jq -r '.data.tokens.accessToken')

# Create vendor
curl -X POST http://localhost:4000/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"New Vendor","category":"Technology","contactName":"John","contactEmail":"john@new.com"}'
```

### 2. Cache Demo
```bash
# First request (cache miss)
time curl -s http://localhost:4000/api/dashboard/stats -H "Authorization: Bearer $TOKEN"

# Second request (cache hit - faster)
time curl -s http://localhost:4000/api/dashboard/stats -H "Authorization: Bearer $TOKEN"
```

### 3. RBAC Demo
```bash
# Viewer cannot create (403 Forbidden)
VIEWER_TOKEN=... # login as viewer
curl -X POST http://localhost:4000/api/vendors \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test"}'
```

## Resume Bullets

- Built a multi-tenant MERN platform to manage vendors, contracts, and invoices with secure JWT authentication and role-based access control
- Designed REST APIs with pagination, filtering, and validation, and shipped a React admin console with optimistic updates and error recovery
- Decoupled invoice generation and notification delivery using queue-backed background jobs with retry + idempotency safeguards
- Added Redis caching for hot reads and spend dashboards, reducing average read latency and database load during peak usage
- Implemented Stripe subscription tiers in test mode with feature gating to model SaaS monetization and usage limits
