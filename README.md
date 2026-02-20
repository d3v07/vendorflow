# VendorFlow

Multi-tenant vendor management SaaS with per-tenant data isolation, RBAC authorization, contract and invoice lifecycle management, and Stripe billing integration.

## Architecture

```
apps/
├── api/          # Express REST API
└── web/          # React frontend
packages/
└── shared/       # Shared TypeScript types and schemas
```

## Features

- **Multi-tenancy** — slug-based tenant isolation at the data layer
- **RBAC** — role-based access control across 20+ tenant accounts
- **Vendor management** — full CRUD with category and status filtering
- **Contracts** — create, track, and manage vendor agreements
- **Invoices** — generate invoices with async billing via queue workers
- **Stripe** — webhook-verified payment processing
- **Redis caching** — in-memory cache for high-frequency read paths
- **Swagger** — auto-generated API docs at `/api/docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB + Mongoose |
| Cache | Redis |
| Auth | JWT + refresh tokens |
| Payments | Stripe |
| Frontend | React, TypeScript, Tailwind CSS, shadcn/ui |
| Monorepo | pnpm workspaces |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- MongoDB (local or Atlas)
- Redis

### Setup

```bash
pnpm install

# API
cp apps/api/.env.example apps/api/.env
# fill in your values

# Web
cp apps/web/.env.example apps/web/.env

# Run both
pnpm dev
```

API runs on `http://localhost:3000`
Frontend runs on `http://localhost:5173`
Swagger docs at `http://localhost:3000/api/docs`

## Environment Variables

### API (`apps/api/.env`)

```
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
REDIS_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Web (`apps/web/.env`)

```
VITE_API_URL=http://localhost:3000
```

## Stripe Webhook

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

## License

MIT
